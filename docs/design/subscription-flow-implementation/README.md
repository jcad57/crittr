# Implemented subscription flow

Implemented October 28, 2026, using the approved screen references. Generated illustrations live in `assets/images/pro/`; their backgrounds are transparent. The irregular surfaces behind illustrations, benefit cards and the welcome/management cards are native SVG paths. The built-in imagegen tool was used for the four illustrations; exact prompts are in `illustration-prompts.json`.

## Flow and behavior

1. **Upgrade:** cream paywall, generated dog/cat artwork, four benefit tiles and a compact No ads benefit row, localized annual/monthly plans, live trial eligibility and pinned Continue action. Trial disclosure and restore/terms/privacy/redeem links use a compact footer so both plan options remain visible. The Free-plan summary banner is omitted.
2. **Purchase review:** selected plan, full billing cadence, amount due today and eligible trial terms. The dark SVG card has extra top breathing room. Subscribe and Change plan are anchored above the bottom safe area; the payment attribution caption is removed. No purchase starts automatically when this screen opens.
3. **Native payment sheet:** the existing RevenueCat purchase function invokes Apple's or Google's native sheet. Crittr does not draw or collect payment credentials.
4. **Getting Pro ready:** store receipt acknowledgement, server access verification, then animated ready/completed states. The pulsing current step respects the system's Reduce Motion preference; state changes are announced to assistive technology. The ready state is reached only after verified access. A short completion transition leads into welcome.
5. **Welcome:** the Get started action opens Make Pro Yours. Setup can be skipped.
6. **Make Pro Yours:** account photo or account initials, Add another pet, Upload a medical record and Ask CrittrAI cards, plus an Invite your care team link. The record card uses an owned pet, preferring the selected living pet. With no owned pets it explains that a pet must be added first; loading/error states do not send users to the wrong destination.
7. **Subscriptions:** dark plan card, actual store price/status/renewal metadata, native management action, restore, benefits and management CTA. Cancellation, trials, billing issues, promotional/lifetime grants and family sharing retain distinct wording and management behavior. Free accounts see the dedicated Free-plan overview.

## Recovery

- Cancellation returns to review without an error.
- Native purchase monitoring has a 30-second watchdog and a 2.5-second callback grace period after returning from the store. A missing callback ends the loading state and offers Check purchase status; elapsed time is never treated as proof of cancellation or payment.
- A shared native purchase guard survives screen changes and keeps an unresolved SDK call single-flight. Late success, cancellation and errors are consumed once. A genuine error permits a fresh retry; an ambiguous store error requires checking access or restoring first.
- An unresolved purchase checks the server directly, so a stalled SDK identity queue cannot block that recovery action. Restore is offered after the native request has settled. Back to Crittr remains available during recovery.
- Pending payment only checks status; it does not start another purchase. Returning from the store to a pending screen checks again.
- A confirmed purchase with a delayed server projection offers Retry activation, with reassurance that it will not charge again.
- Restore failures display a receipt illustration, account/connection guidance and restore/retry actions.
- A failed first purchase displays checkout-specific recovery copy and a Try again action, with restore available separately.
- Changed product/price/currency is rejected before opening the payment sheet and sent back for review.
- Already-owned purchases and verified server grants activate existing access instead of purchasing again.
- Preflight, offering, restore and access checks have bounded waits. Leaving the screen or changing accounts prevents an in-flight attempt from navigating to success later, and the native dispatch also fences account changes during setup.
- Background profile/cache refresh errors do not turn a successfully verified activation into a failed checkout.

## Validation

Automated tests cover purchase races, normal and late cancellation, missing callbacks, app return, late success/errors, a failed concurrent status check, screen reattachment, stalled SDK queues, pending checks, price changes, already-owned products, server grants, restore failures, retry behavior, account changes, unmounts, action routing, account avatar selection and subscription metadata variants. The complete repository test, TypeScript, lint and architecture checks are run for this change.

The spacing/cancellation revision passed all 315 tests (146 TypeScript and 169 runtime/database tests), `npm run check` and `git diff --check`. Lint reports 169 existing advisory warnings and zero errors; the architecture guard reports no new violations.

Native iOS visual QA uses the running app for purchase review, welcome and Make Pro Yours. Local non-transactional fixtures exercise activation, pending, error and management layouts; the temporary fixture route is removed after inspection. No real store purchase is made during visual QA. A full App Store sandbox / Google Play license-tester transaction remains a release validation step, including the native payment confirmation and production backend reconciliation.

Simulator failures alone do not establish the cause of a store failure. RevenueCat documents [sandbox instability and simulator setup](https://www.revenuecat.com/docs/test-and-launch/sandbox/apple-app-store), and warns that a [store-problem error can have an uncertain payment outcome](https://www.revenuecat.com/docs/test-and-launch/errors). Crittr preserves that distinction. This checkout does not unlock Pro until the backend verifies access; intended sandbox tester UUIDs must be enrolled in `billing_test_accounts` as described in `docs/subscription-architecture.md`.

## Native captures

- [Paywall](paywall.png)
- [Purchase review](purchase-review.png)
- [Getting Pro ready](activation.png) — local state fixture
- [Activation animation](activation-preview.mp4) — short simulator recording of local step transitions
- [Welcome](welcome.png)
- [Make Pro Yours](make-pro-yours.png)
- [Subscription management](subscription-management.png) — sample subscription metadata
- [Pending payment](pending-payment.png) — local state fixture
- [Restore / retry](restore-retry.png) — local state fixture
- [Updated compact paywall footer](spacing-fixes/paywall.png) — native iPhone 17 Pro, both plans visible
- [Updated purchase-review spacing](spacing-fixes/purchase-review-monthly.png) — native monthly review, no transaction started

The simulator's development overlay is visible in these captures. The sample management date/price is illustrative; the production screen reads store metadata. The four final generated assets are `assets/images/pro/companions.png`, `getting-ready.png`, `pending.png` and `receipt.png`.
