# Upgrade and subscription audit — October 29, 2026

Scope: plan selection, pricing and trial eligibility, native purchase identity, cancellation and pending payments, activation, restore, account changes, subscription management, entitlement reconciliation, webhooks, database authorization, and website signup handoff.

This is a source and regression-test audit. It does not certify current dashboard configuration or a completed store transaction. A subsequent [October 29 deployment](billing-functions-deployment-2026-10-29.md) published the shared backend guard in all three billing functions and verified their source and authorization rejection. Mobile release remains separate. No purchases, account grants or dashboard configuration changes were made during the audit or redeployment.

## Findings fixed

| Finding | Resulting behavior |
| --- | --- |
| Trial eligibility could change after the review screen loaded. | Checkout rechecks the chosen package's trial immediately before payment. Changed price or trial terms require reviewing the plan again; no purchase is dispatched. The recovery screen's primary action is Review plan. |
| An unavailable native entitlement lookup was treated as Free during purchase preflight. | Plan browsing can recover with the normal paywall; purchase preflight fails closed with a connection/retry message. Already verified Pro members activate without purchasing. |
| Pending or existing-access checks could depend on stale native data. | Status checks verify with the server directly, including when the SDK identity queue is stalled. An unconfirmed pending payment stays pending without claiming that payment succeeded. |
| Auth, catalog, sync, or subscription-price calls could leave callers waiting indefinitely. | These calls have bounded waits. Unresolved pricing cannot enable checkout; missing management prices display a dash while retaining subscription information. |
| Pricing work could finish after an account change. Restore also had a setup interval before native identity fencing. | Pricing discards old results, and restore checks the auth generation after SDK configuration before dispatch. |
| Already-owned/activation recovery offered verification but no direct restore button. | Confirmed recovery now also offers Restore purchases. Retry activation and restore never invoke a new purchase. |
| An accidental Test Store key could reach a native release build. | Release configuration rejects `test_` keys before native SDK initialization. It fails as unavailable rather than configuring the Test Store. |
| Missing store/environment metadata could be classified as production. | Incomplete non-promotional provider data returns unknown, retaining the previous verification without extending its timestamp. Valid sandbox purchases still require an enrolled tester. |
| Purchase analytics used a product ID as the transaction ID. | Analytics uses the SDK's transaction identifier. Entitlement authorization remains independent of analytics. |

The provider response guard follows the store and `is_sandbox` fields in RevenueCat's [Customer Info response example](https://www.revenuecat.com/docs/api-v1/entitlements).

## Existing safeguards reviewed

- Purchase requests are single-flight across screen instances until the native SDK settles. A timeout never means that a charge was cancelled.
- A 30-second native callback watchdog and a 2.5-second foreground grace period expose recovery. Late success, cancellation and errors are consumed without buying again.
- Cancellation returns to review without an error; pending payments and uncertain outcomes have distinct messages and actions.
- Account-generation and SDK identity checks fence purchases, restores, results and navigation. Sign-out clears session caches and verified client state.
- Native purchase metadata alone cannot authorize Pro. Activation requires the verified profile used by database policies and paid server functions.
- Reconciliation derives identity from the authenticated Supabase user. Client-provided identity hints cannot grant another account access.
- Webhooks authenticate a configured authorization value, deduplicate event IDs, retry failures and reconcile current provider state. Transfers reconcile both accounts.
- Per-account leases and fencing tokens prevent older reconciliation work from overwriting newer results.
- Cancellation retains paid access through its expiry. Expiration/refund/revocation and malformed responses have separate behavior; downgrade retains user data.
- Background launch/foreground, SDK updates, profile Realtime and scheduled reconciliation recover missed updates.
- Website signup preferences route to native checkout; they do not start a trial or grant an entitlement.

## External release checklist

Complete these in order on the intended production project. Record the build, test UUIDs and relevant delivery/transaction IDs as release evidence; keep credentials out of screenshots and logs.

### 1. Deploy the audited source

- [ ] Release the updated mobile app through the normal build/release process, preserving unrelated work in this checkout.
- [x] Deploy **all three** billing functions because they share the updated evaluator: `sync-crittr-pro-entitlement` version 30, `revenuecat-webhook` version 10, and `reconcile-crittr-pro-entitlements` version 3. Source readback and six authorization rejection checks passed; see the deployment record.
- [ ] Verify the existing billing RPCs, protected profile fields, tables and profile Realtime publication described in `docs/subscription-architecture.md` exist. This audit adds no SQL migration.
- [ ] Separately confirm the revised pet/co-care server policies from `20261028160000_revised_free_pro_tiers.sql` are deployed in the correct order. Local passing policy tests do not prove production has those policies. Avoid a blind migration push over unrelated pending migrations.

### 2. Check release keys and project identity

- [ ] In the production EAS/build environment, confirm `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` is the iOS platform public SDK key and `_ANDROID` is the Android platform key. Both must belong to the RevenueCat project read by the backend. Rebuild after changing embedded environment values.
- [ ] Confirm the iOS bundle ID and Android package match their store/RevenueCat apps. The current source uses `com.jcadeichmann.crittr` for both.
- [ ] Keep `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_WEBHOOK_AUTH`, and `ENTITLEMENT_RECONCILE_AUTH` in backend secrets only. No secret API key belongs in an `EXPO_PUBLIC_` or `VITE_` variable.
- [ ] Use the normal platform key for TestFlight and production. RevenueCat Test Store is optional debug tooling and is **not enabled end to end here**: the server still rejects `test_store` transactions. It needs a separate, deliberately scoped test-account integration before use. The release guard does not turn it on. [RevenueCat launch checklist](https://www.revenuecat.com/docs/test-and-launch/launch-checklist), [Test Store](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store).

### 3. Check the RevenueCat catalog

- [ ] In Product catalog, attach the correct monthly and annual store products to entitlement **`crittr_pro`**. The exact legacy `Crittr Pro` identifier remains supported, but use the canonical ID for new configuration.
- [ ] Confirm the current/default offering supplies the correct Monthly and Annual packages for each platform. Package cadence, store product duration, currency and displayed renewal price must agree.
- [ ] Verify each advertised free trial exists on the corresponding store product. Test with both an eligible store account and one that already used its introductory offer.
- [ ] Confirm the RevenueCat customer's App User ID is the Supabase Auth UUID used to log into Crittr, including after website signup and account switching.
- [ ] Review Project settings → General → restore/transfer behavior. Test the chosen ownership rule with two Crittr accounts sharing one store account; confirm access moves or stays according to that rule. [RevenueCat restore behavior](https://www.revenuecat.com/docs/projects/restore-behavior).

### 4. Check Apple configuration

- [ ] In App Store Connect → Business, confirm the Paid Apps Agreement, required tax forms and banking setup have no outstanding actions. [Apple agreement guidance](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/).
- [ ] Verify monthly and annual subscriptions are configured in the intended subscription group, available in intended territories, and have complete localization/review metadata and appropriate sale/review status. Check introductory offers on each product. [Apple In-App Purchase setup](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases/).
- [ ] In RevenueCat's iOS app configuration, validate the required Apple credentials. Set **both Production and Sandbox App Store Server Notification URLs** in App Store Connect to RevenueCat's supplied URL; Version 2 is recommended. The Apple URL points to RevenueCat, not directly to Supabase. [Apple server notifications setup](https://www.revenuecat.com/docs/platform-resources/server-notifications/apple-server-notifications).
- [ ] Verify subscription name/duration, full renewal price, trial length/post-trial price, restore access, Terms of Use and Privacy Policy are clear and working in the release build and store metadata. The current terms source still carries a draft marker; confirm approved content has replaced or approved that draft before submission. [Apple subscription presentation requirements](https://developer.apple.com/app-store/subscriptions/).

### 5. Verify RevenueCat → Supabase delivery and recovery

- [ ] The webhook destination is `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`, on the same project as the app. Its Authorization header must match the configured backend value.
- [ ] Enable production and sandbox delivery, all intended apps, and the complete subscription lifecycle, including purchase, renewal, cancellation, expiration, refund/billing events, transfers and promotional grants/revocations.
- [ ] Confirm a **real lifecycle event** returns HTTP 200, appears completed in `billing_webhook_events`, and updates the expected profile. A dashboard TEST returning 200 only establishes endpoint reachability/authentication.
- [ ] Confirm missing/invalid authorization is rejected by all billing endpoints. This repository intentionally uses in-handler authentication with `verify_jwt = false`: user sync verifies the JWT via `auth.getUser()`, webhook checks its configured authorization, and the worker checks its dedicated credential. Preserve these checks when deploying.
- [ ] Inspect failed/retrying deliveries and retry them after resolving the error. Webhook retries are finite, so alerts and operational follow-up matter. [RevenueCat webhook delivery and retries](https://www.revenuecat.com/docs/integrations/webhooks).
- [ ] Confirm `crittr-pro-reconciliation` is active, its scheduled HTTP calls succeed, and its Vault URL/credential match the intended project and worker secret. Monitor `failed`, `failuresByReason`, and the oldest verification time against the 72-hour access-verification window.
- [ ] The worker sweeps previously active profiles in bounded batches; it is not discovery for every new Free customer. Missed first-purchase webhooks are recovered by app launch/status/restore reconciliation or a targeted trusted support reconciliation. Do not rely only on cron for new purchases.

### 6. Prepare sandbox and review accounts

- [ ] Create dedicated test accounts. Enroll their **Supabase UUIDs** in `billing_test_accounts` through trusted admin tooling before full sandbox/Review purchase tests. Do not enable sandbox authorization for every customer.
- [ ] Supply an appropriate working review account and instructions for Apple review. Ensure that account can complete the subscription flow under the sandbox authorization rule.
- [ ] Perform release acceptance on a **physical iPhone using the actual TestFlight build**. The simulator and Test Store do not establish that the Apple store integration works. [RevenueCat sandbox/TestFlight guidance](https://www.revenuecat.com/docs/test-and-launch/sandbox/apple-app-store).

### 7. Android and website checks, if releasing them

- [ ] For Android, validate Play service credentials, active subscription base plans/offers, license testers and release-track availability. Connect Cloud Pub/Sub/RTDN, send a test notification and verify RevenueCat's received timestamp. [Google notification setup](https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications).
- [ ] Publish the matching landing-page tier copy through its hosting workflow. Confirm production signup/OAuth configuration, the same Supabase project and plan/billing handoff using the same account/provider. A website Pro choice must open native review, without charging or granting Pro on the website.

## Required release acceptance evidence

For each successful purchase, confirm **all three**: correct RevenueCat customer/entitlement; verified Supabase profile and paid API/database access; correct app activation and subscription details. For every retry/cancellation test, confirm no extra store transaction was created.

| Scenario | Expected outcome |
| --- | --- |
| Annual and monthly, new subscriber | Correct price/cadence and one transaction; verified Pro → welcome → Make Pro Yours. |
| Eligible and ineligible introductory offers | Accurate due-today/renewal terms; no trial promised after eligibility changes. |
| Cancel the native sheet; fail then dismiss | Return to usable review/recovery with no indefinite loading. |
| Pending/deferred payment, then approved | Pending message; status checks only; activate after server confirmation. |
| Offline before purchase | Recoverable error, no purchase dispatched. |
| Network loss after store success | Retry activation/restore without another purchase; unlock after verification. |
| Background/foreground and force quit after confirmation | Reconcile the existing transaction on return/relaunch; no accidental repurchase. |
| Repeated taps and leaving/reopening checkout | One outstanding native purchase; late results handled safely. |
| Sign-out/account switch during lookup, purchase or restore | No old result grants/navigates the new account. |
| Restore on reinstall/new device | Existing subscription activates on the intended Crittr account under the chosen transfer rule. |
| Manage/cancel, renewal, expiry, refund, billing recovery | Correct store management page and status; access follows verified dates/events; retained pets/files are not deleted. |
| Promotional/lifetime grant and revocation | Correct non-recurring wording and independently verified access. |
| Free versus Pro server gates | Fourth owned pet, second co-carer per pet, uploads and AI require appropriate Pro access; unlimited Free saved care/logs remain available. |

## Validation performed

- `npm test`: **337 passed**, comprising 147 TypeScript tests and 190 runtime/database tests.
- `npm run check`: TypeScript passed; ESLint had zero errors and 170 advisory warnings; architecture guard reported no new violations.
- The changed shared evaluator and its tests also passed a separate strict TypeScript check. All three billing entry points subsequently passed `deno check` during redeployment; authenticated store processing remains release acceptance work.
- `git diff --check` passed.
- Regression coverage includes changed trial terms, stale native payment data, strict purchase preflight, missing SDK callbacks, cancellation, deferred payment, timeout recovery, account changes, restore actions, release-key protection, malformed store/environment data, billing webhook delivery/retry and database authorization.

Native store confirmations, current external dashboard settings, real sandbox transactions and release of this audit's mobile changes remain release acceptance work. The three billing functions were subsequently redeployed as recorded above. The code audit does not determine the root cause of a specific simulator cancellation without that transaction's store/debug evidence.

