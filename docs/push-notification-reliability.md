# Weight and notification rollout

The newer [October 28 care notification audit](push-notification-audit-2026-10-28.md)
documents per-task server reminders, shared completion suppression and the rollout
that supersedes the local-reminder and invitation-only limitations below.

## Invitation dispatch deployed October 26, 2026

The live invite flow already inserted registered-user inbox notifications and
queued push deliveries, but the dispatcher, private worker credential and Cron
job were missing. Existing queue jobs had zero attempts. The email function
`send-co-care-invite` was already active, with `RESEND_API_KEY` and `FROM_EMAIL`
configured; its deployed email source was preserved.

Deployed `dispatch-notification-pushes` with a private `PUSH_DISPATCH_AUTH` secret
and matching Vault secret `crittr_push_dispatch_auth`. The active
`crittr-notification-push-dispatch` job invokes it every minute. The deployed
worker is **invitation-only**: it calls the service-only
`claim_co_care_invite_push_deliveries()` RPC from
`20261026150000_invite_push_delivery.sql`, which exclusively claims
`co_care_invite` and `co_care_invite_requires_pro` jobs. It checks that the invite
is still pending for the recipient and current pet owner, honors device
registration and the existing `notify_co_care_activities` push preference, and
uses the shared Expo ticket/receipt/retry processor. Answered/deleted invites are
skipped without changing the inbox. This deployment does not install the broader
co-care integrity migration or change pet access policies.

The client routes nonmembers to the existing email function. Registered Free and
Pro members receive an inbox invite and a push job for each enabled registered
device; they are not sent the signup email. `services/coCare.ts` now stops on a
lookup failure instead of treating a lookup outage as proof that the person has
no account. This small client change ships with the next JS bundle; the server
dispatch repair is live immediately.

The first general scheduled run, before narrowing the worker, submitted two
previously queued acceptance updates to Expo and skipped three already answered
invitation jobs. Automatic approval review then rejected a manual general batch
send because its scope also included acceptance notifications. The job was
paused, the dispatcher was restricted to invitations, and the activity sender
was restored from the committed source in an isolated deployment directory.
The invitation-only schedule was then re-enabled. No test emails or test pushes
were sent to real users. The accepted-update queue rows from that first run
retain their Expo ticket IDs; the invitation-only worker does not claim them.

Verification: a transaction against the live database created a temporary linked
invite, confirmed its inbox row and one eligible push job per registered device,
checked that answering it makes the jobs ineligible, and checked the nonmember
path. All writes were rolled back before any worker could see them. Both email
and push endpoints reject unauthenticated requests. All 219 tests passed (145
TypeScript and 74 runtime/database), along with TypeScript checking, targeted
ESLint, the architecture guard and Deno checking of the affected functions.
Tests cover Free/Pro routing, nonmember email requests and provider errors,
lookup failures, per-device queue creation, invitation-only claiming, stale
invites and notification opt-outs. Physical-device banner presentation and real
email inbox delivery remain separate from these server/configuration checks.

## Verified changes

- Weight history starts at All, before 1W, 1M, 3M, 6M, and 1Y.
- One live weigh-in per pet/date, enforced by a unique database index. A conflict returns to the app for a Continue/Cancel confirmation. Continue atomically updates the chart point, activity, and pet's latest weight; Cancel leaves them untouched. Moving an edited reading onto an occupied date uses the same confirmation. Backdated readings cannot replace a newer current weight. Existing duplicate readings and their linked activities are archived in `pet_weight_entry_revisions` before consolidation.
- Push settings uses Expo Router's focus hook. Permission and registration errors have a retry surface; saving preferences has bounded retries. Category opt-outs cancel local reminders even while offline.
- Android creates its notification channel before requesting permissions/tokens, places the channel on scheduled triggers, and declares `SCHEDULE_EXACT_ALARM`. Settings offers an explicit Alarms & reminders action. Medication reminders use alarm-clock delivery when Android permits it; this can display Android's alarm icon. Rebuild Android after this native configuration change.
- Permission success reschedules immediately. Registration refreshes on native token changes, resume, and reconnect, with bounded retries and account-change fencing. Token-listener updates pass the native token directly to Expo to avoid a registration loop. Sign-out removes this device's remote registration where connected and cancels its local reminders. An offline sign-out cannot synchronously revoke a registration on the server.
- Cold-launch taps and already-running taps share deduplication and account checks; external/auth destinations are rejected.
- Interval medication reminders shortly after midnight are scheduled on the preceding day when the five-minute lead crosses midnight. The daily exercise check-in repeats without requiring the app to open every morning and asks users to review activity, without asserting unfinished goals from stale data.
- Reminder rebuilds preserve installed reminders when fetching fails. The iOS plan reserves slots within its pending-notification limit, keeps recurring reminders and nearest dated reminders, and replenishes on resume/reconnect/pet changes. At capacity, obsolete requests must be retired to make room; far-future interval dates require a later app refresh. This is local scheduling, not an unlimited server reminder service.
- Shared-care notifications enqueue per-device jobs inside the transaction creating the inbox notification. A worker checks tickets and receipts, retries network/429/5xx/provider failures, removes invalid device registrations, expires stale alerts after 24 hours, rechecks preferences/access, and leases jobs to prevent overlapping workers from sending the same job concurrently. Receipt success confirms handoff to APNs/FCM, not that a person saw the banner.
- The legacy one-token table remains compatible with existing app versions; its writes mirror into the new multi-device table. Realtime refreshes the inbox and badge; remote OS banners come from the queue to avoid double presentation.
- `ADS_ENABLED` in `config/featureFlags.ts` is false. All banner, app-open, interstitial, SDK initialization, and ad-consent paths honor this switch. Native integrations and placement configuration remain intact.

## Install the missing billing helper

Open `docs/sql/install-verified-pro-helper.sql` and run the **entire file** in the linked Crittr project's Supabase SQL Editor as the administrator (`postgres`). It is safe to rerun. It installs:

- `public.account_has_verified_pro(uuid)` and required protected profile metadata;
- private sandbox enrollment and administrator grant tables;
- expiring, service-only administrator grants and the profile projection;
- protection against authenticated clients forging verification metadata.

The final two SELECT statements confirm the function exists and report aggregate verified account counts. This helper recognizes a recent server-verified production/promotional entitlement, an explicitly enrolled sandbox account, or an unexpired administrator grant. It does **not** turn existing boolean flags into verified purchases. A zero verified count means the account mirror still needs real reconciliation; do not mark rows production or manufacture verification timestamps to work around it.

The standalone script does not replace pet-access policies or change `user_has_crittr_pro`. For the full subscription rollout, follow `docs/dev-reliability-and-sdk58.md`: apply `20261026120000_subscription_reliability.sql`, deploy matching RevenueCat handlers and reconciliation functions, then reconcile existing subscribers. The full migration accepts the standalone helper already being present. Do not deploy the newer reconciliation function against only the standalone script: it also needs the full migration's reconciliation RPCs/tables.

The two newer migrations below are also compatible with a database where that earlier billing rollout has not happened. They use existing access checks and additionally apply the verified billing guard once installed. Installing the helper therefore makes shared-care push eligibility stricter; reconcile both owner and co-carer accounts before expecting those activity pushes.

## Apply the weight and push changes

1. Run the corrected `supabase/migrations/20261026130000_daily_weigh_ins.sql` in full. Run it again if an earlier copy was applied: the corrected script is safe to rerun and avoids calling `pet_is_writable` when that newer helper is absent.
2. Run the corrected `supabase/migrations/20261026133000_push_delivery_queue.sql` in full. This copy avoids the previous `account_has_verified_pro(uuid) does not exist` error and can be rerun after an earlier attempt.
3. Deploy the matching functions to the linked project:

   ```sh
   supabase functions deploy push-co-carer-activity --project-ref slnmfelxigtlrdyogsjn
   supabase functions deploy dispatch-notification-pushes --project-ref slnmfelxigtlrdyogsjn
   ```

4. Create a random server-only `PUSH_DISPATCH_AUTH` secret in Supabase Edge Function secrets. Save the same value in Vault as `crittr_push_dispatch_auth`. Then run `docs/sql/schedule-notification-dispatch.sql` in SQL Editor: it enables Cron and schedules the authenticated worker every minute. Do not put the secret in the mobile app, public environment variables, Git, or chat. The worker handles 50 due deliveries per run; monitor backlog and increase throughput if needed. An activity's client request wakes the same queue immediately, but Cron is necessary for retries, receipts, and other shared-care events when the originating app is closed.
5. If Expo push access-token protection is enabled, set server-only `EXPO_ACCESS_TOKEN` on both functions. Verify the EAS project has working APNs and Android FCM v1 credentials. The project's `google-services.json` alone does not establish server FCM v1 authorization.
6. Rebuild/install Android for the exact-alarm permission; refresh notification setup on test devices. Verify the installed build's push permission, registration, and Alarms & reminders setting.

The original rollout above stopped at local implementation and read-only hosted inspection. The invitation-only deployment recorded at the start of this document was completed later. This repository's older migrations have no matching remote migration history, so do not use an unreviewed blanket `supabase db push` against the existing database. The invitation dispatcher currently excludes activity and acceptance messages; a broader queue rollout needs a separately reviewed deployment and scheduler scope.

## Verification and operations

`npm test` includes migration compatibility on the older deployed schema, migration reruns, historical weight consolidation, conflict confirmation, atomic weight writes, token/device ownership, queue leases/preferences, Expo ticket/receipt failures, local scheduling limits, midnight timing, and disabled-ad paths. `npm run check` covers TypeScript, lint, and architecture. Changed Edge Functions also pass Deno type checking.

After deployment, test a meal/medication/vet reminder with the app foregrounded, backgrounded, terminated, and after restarting the device. Test a remote shared-care activity and membership change, multiple devices, offline/reconnect, notification opt-out, and a tap that launches a terminated app. Use a release or development native build. Validate APNs/FCM delivery on physical iOS and Android devices; simulator UI testing alone does not verify production credentials or Android power-management behavior.

Monitor `notification_push_deliveries`: `expo_ticket_id` means Expo accepted the request; `completed_at` plus a null `last_error` means its receipt confirmed provider handoff. Non-null errors expose disabled recipients, expired alerts, invalid credentials, invalid tokens, or provider problems. Alert on recurring errors and an aging backlog. Retain completed jobs as needed, then clean up old completed rows with an administrator job.

Expo/APNs/FCM and OS notification controls remain external dependencies. Focus modes, denied permissions, device power policies, and network/provider outages can delay or suppress presentation. The app can retry and expose failures; it cannot guarantee that every alert is displayed at an exact time.

References: [Expo notifications and exact alarm permissions](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/), [Expo delivery tickets, receipts, and retries](https://docs.expo.dev/push-notifications/sending-notifications/).
