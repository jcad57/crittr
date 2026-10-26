# Dev reliability and Expo 58 rollout

This review started from updated `dev` at `a021141`. The old `main` review in `stash@{0}` was not applied. Its unstashed generated review files were preserved in `/private/tmp/crittr-dev-reanalysis-backup/main-review-untracked/`. Existing untracked `docs/feature-inventory.md` was left alone.

## Findings on current dev

| Area | Finding and implemented change |
| --- | --- |
| Cold start | Supabase awaited an async auth listener that performed database reads while holding its auth lock. The listener now returns synchronously and defers hydration. A cached account shell can render while validation runs in the background. |
| Dashboard | Routing awaited pet prefetch and a focus callback cancelled healthy fetches after two seconds. Prefetch is optional; failures expose a retry. Tabs mount lazily, only the selected pet warms first, and warming shares the mounted detail query. |
| Background work | Reminder and vet-visit maintenance competed with the initial dashboard. Maintenance now starts after initial rendering. Reminder replacement fetches/builds the complete plan first, installs replacements, then removes obsolete reminders. |
| Persistence | The previous query snapshot used a global account key and persisted almost everything. Shell queries now persist under the authenticated UUID, expire after 24 hours, and reject delayed reads/writes after an account change. Auth snapshots and secure session writes are serialized. Sign-out fences hydration and clears drafts/caches immediately. |
| Resume | Focus stayed false after a long background period. One lifecycle owner now coordinates query focus, connectivity and Supabase refresh, always restoring focus on resume. |
| Pro | Labels, native CustomerInfo and backend gates disagreed. Paid features and labels now use the same verified server projection; CustomerInfo remains purchase metadata. Plain manual profile flags do not grant access. |
| Billing security | Sync trusted client RevenueCat IDs. It now queries only the caller's verified Supabase UUID. Native login, purchase, restore and logout share one identity queue; stale account work is rejected. |
| Entitlement expiry | Empty verified subscriber responses preserved Pro forever. They now revoke access; provider failures preserve the last verification for a bounded 72-hour window. Explicit RevenueCat lifetime/promotional entitlements remain supported. Transfers reconcile both UUIDs and failed webhooks remain retryable. |
| Downgrade | Dev had already replaced hard pet deletion with soft archive, but cleanup still removed sharing relationships. Cleanup now preserves pets, history and memberships. Database policies restrict extra pets to read-only on Free and restore access on renewal. Historical `pro_downgrade` archives become visible again. |
| Backend | Additional pet creation, medical uploads and document scanning now enforce Pro on the server. Co-care acceptance is atomic; invitation retargeting, permission escalation and replay are blocked. |
| Existing improvements retained | Dev's batched detail service, paginated activity screen, native Apple/Google sign-in, Firebase analytics, exercise plans and medication scheduling remain in place. |

## Pro authority and manual QA access

RevenueCat's canonical `crittr_pro` entitlement is verified server-side and projected onto the profile. Access requires an active projection, a valid expiry (or verified RevenueCat lifetime grant), and a verification no more than 72 hours old. Sandbox receipts require explicit enrollment in `billing_test_accounts` before reconciliation; do not enable sandbox access for all release users.

Administrator grants are a separate, service-only source. Use the SQL editor or trusted admin tooling:

```sql
select public.set_crittr_pro_admin_grant(
  '<supabase-user-uuid>'::uuid,
  now() + interval '30 days',
  'QA test account'
);
```

Grants require a reason and an expiry within 90 days. They immediately update the same projection used by app/API gates, survive RevenueCat reconciliation, and expire automatically. Revoke with `delete from public.billing_admin_grants where user_id = '<uuid>';`. A real store purchase is recovered by the next reconciliation. The account-specific 30-day QA command prepared in this chat is `docs/local/test-pro-grant.sql` (ignored by Git). It has not been executed remotely.

## Backend deployment order

The app requires the matching backend. Do not release it against the old billing functions.

1. Pause old reconciliation jobs and prevent destructive downgrade handlers from running during rollout. Deploy the data-preserving cleanup shared module with billing handlers. The new handlers may temporarily return 5xx until the migration RPCs exist; webhook retries are expected during this maintenance window.
2. Apply the checked-in migrations in order, including `20261026120000_subscription_reliability.sql` and `20261026123000_co_care_integrity.sql`. The migration exposes previously archived pet records; confirm this on staging first. Back up the database using normal deployment procedures.
3. Deploy `sync-crittr-pro-entitlement`, `revenuecat-webhook`, `reconcile-crittr-pro-entitlements`, and `parse-medical-record`. Shared imports deploy with their entry points. Keep the existing `REVENUECAT_SECRET_API_KEY` and `REVENUECAT_WEBHOOK_AUTH`; set a strong `ENTITLEMENT_RECONCILE_AUTH` for the scheduler. Service credentials stay server-side.
4. Enroll known sandbox/App Review tester UUIDs in `billing_test_accounts`, and apply explicit QA admin grants as needed. Reconcile existing accounts before releasing the app: old flags without verified environment metadata will deliberately fail closed until reconciliation.
5. Schedule POST calls to `reconcile-crittr-pro-entitlements` with `Authorization: Bearer <ENTITLEMENT_RECONCILE_AUTH>` every minute. A batch processes up to 20 active profiles not verified in the last hour, four at a time. Monitor `failed` and increase scheduling throughput if the active population exceeds the batch capacity. Failed jobs/webhooks must be retried. This job is not automatically installed by the repository.
6. Confirm staging cases: free account, additional pet, paid purchase/cancellation/expiry/refund, restore, transfer between accounts, sandbox enrollment, explicit admin grant/revoke, offline launch and sign-out during hydration. Then release the rebuilt app. Existing lifetime grants need RevenueCat verification, rather than a manual boolean.

No remote migrations, function deployments, scheduler installation or production account edits were performed from this workspace. No Supabase administrative credentials were available. The previously reported Firebase private key was not present in the current dev checkout; historical revocation still needs checking in Google IAM.

## Expo / Device Hub

The app now uses Expo `~58.0.19`, React Native `0.88.0`, React `19.3.0`, and `expo-device-hub ^0.18.0`. Expo-managed packages follow the SDK58 compatibility matrix. Firebase, native sign-in and analytics from dev were retained. Removed RN APIs/types were migrated, and a config plugin initializes Firebase before Expo's iOS 27 scene starts React Native. The login scroll container owns its stacking layer, so the background cannot cover the form.

Use Node 24 (`nvm use`; supported even-numbered Node versions are declared in package.json):

```sh
npm ci
npx expo prebuild --platform ios --no-install
pod install --project-directory=ios
npx expo run:ios
```

For testing, keep Metro running with `npx expo start --dev-client`. Press Shift+M and choose Device Hub, or open `http://localhost:8081/_expo/plugins/expo-device-hub`. `npm run devicehub` also starts the Hub CLI. Rebuild native clients after SDK/native dependency changes. Both Apple Device Hub and Expo Device Hub recognize the iOS27 device.

Official migration reference: https://expo.dev/blog/xcode-27-device-hub-expo-device-hub

## Validation and limits

- Expo Doctor: 20/20 checks passed.
- TypeScript and the architecture guard pass; six previous dependency violations were removed (13 pre-existing layer violations remain).
- ESLint has no errors. Existing screens have advisory compiler diagnostics introduced by the SDK58 lint preset, plus existing unused/dependency warnings. Compiler rules are warnings during this migration; rules-of-hooks remain enforced. The React compiler can skip unsupported components. This is not a claim that every screen is fully optimized.
- The existing TypeScript suite and new runtime/database regression suite run through `npm test`; CI runs them alongside type/lint/architecture checks and Expo version validation.
- All historical and new database migrations apply in PGlite with simulated Supabase auth/storage schemas. RLS tests exercise authenticated and service roles; hosted integration tests still need staging.
- Changed Edge Functions pass Deno runtime type checking.
- Xcode27.1 Debug iOS simulator build succeeds with the dev Firebase/sign-in integrations. The SDK58 app launches and its login form is visible in iOS27 Device Hub.
- iOS and Android production JavaScript bundles compile. A native Android build was not run because this host lacks Android SDK/JDK setup. Store purchases, push delivery and a logged-in physical-device cold-start timing must be checked with a staging account and release build. Debug/Metro startup and its memory figures are not release-performance benchmarks.

Next architectural work should follow measurements: move remaining server-state mirrors out of Zustand incrementally, replace multi-request creation/edit flows with transaction RPCs that include dev's new schedule tables, and measure release startup on slow networks and low-memory devices. Dev already has activity paging; do not reapply old-main pagination migrations indiscriminately.
