# IAP and weigh-in incident repair — October 29, 2026

The backend repairs below are live on `slnmfelxigtlrdyogsjn`. The mobile changes are in this checkout and require a new TestFlight/App Store build. No purchase was initiated by this repair.

## Confirmed production causes

- The reported installation came from TestFlight. Apple always runs TestFlight purchases in sandbox. A production EAS profile and an `appl_` RevenueCat key do not change this. The production Expo environment does contain an Apple platform SDK key.
- Production had **zero** rows in `billing_test_accounts`. Its deliberate sandbox policy therefore rejected TestFlight entitlements. The requested account was enrolled, with an exact-one-account assertion, without granting a subscription or changing billing history. RevenueCat's public API subsequently showed an active sandbox monthly subscription for that account. Restore/check access can reconcile that purchase without another checkout.
- The deployed `save_pet_weigh_in` called `public.pet_is_writable(uuid)`, but production did not have that helper. Every permitted caller reaching that expression failed with an undefined-function error. The form did not catch save errors, making Save appear unresponsive.

## Changes

- Add StoreKit-derived environment notices to plan selection, checkout, activation/recovery and subscription management. Use Expo Application's verified `AppTransaction.environment`; distinguish production, sandbox and Xcode, with simulator/signing fallbacks. Unavailable evidence is labeled unknown. Environment detection is display-only and never authorizes Pro.
- Preserve one native purchase across repeated taps and screen instances. Existing checkout ownership remains one user action on the review screen; navigation and activation do not initiate another charge. Regression coverage exercises remount, late callback, cancellation, pending payment and safe retries.
- Poll the verified profile while reconciliation runs, so a successful webhook can finish activation even when an overlapping RevenueCat request is pending. All waits remain bounded and results are fenced to the current account.
- Report `sandbox_restricted` as a verified policy result and show instructions immediately. Webhook processing can still complete successfully for intentionally rejected sandbox access; it does not retry a permanent policy decision.
- Distinguish receipt ownership conflicts from an already-owned product. Direct the user to their original Crittr login/support. Explain that restoring an expired subscription does not renew it and expose Review plans for resubscription.
- Repair only the weigh-in function via `20261029150000_repair_weigh_in_write_guard.sql`. Keep existing pet permission checks and enforce the additional write guard when it is installed. Do not install unrelated billing/tier migrations or consolidate/delete weight history.
- Match weight form/service validation, reject malformed and zero-after-rounding values, prevent repeat Save taps, and display recoverable failures while retaining the form.

## Deployed changes and evidence

| Item | Result |
| --- | --- |
| Weigh-in function | Targeted repair applied in a transaction. A production authenticated save, duplicate rejection, and explicit replacement all succeeded inside a separate rolled-back transaction. Confirmed no test activities remained. |
| Requested sandbox tester | Enrolled and read back as enabled. |
| Entitlement sync | Version 31, ACTIVE. |
| RevenueCat webhook | Version 11, ACTIVE. |
| Reconciliation worker | Version 4, ACTIVE. |
| Bundle verification | Downloaded all three deployed bundles; SHA-256 matched every staged handler/shared source file (3, 4, and 3 files respectively). |
| Endpoint authentication | All three endpoints rejected missing and invalid authorization with HTTP 401 (six checks). |
| RevenueCat iOS offering | Current offering `default` includes `$rc_monthly` → `crittr_pro_monthly` and `$rc_annual` → `crittr_pro_annual`. This verifies catalog mapping, not Apple sale approval or localized device pricing. |
| Regression tests | `npm test`: 361 passed (147 TypeScript and 214 runtime/database tests). Environment tests were rerun after the final fallback refinement. |
| Static checks | TypeScript passed; ESLint zero errors (169 existing/advisory warnings); architecture guard passed; `git diff --check` passed. |
| Native packaging | iOS production JavaScript/Hermes export passed. All three staged billing entry points passed `deno check --no-config`. |

## Architecture research

The useful pattern in the published [Photoroom](https://www.revenuecat.com/customers/photoroom) and [Runna](https://www.revenuecat.com/customers/runna) case studies is to centralize subscription infrastructure and lifecycle data in RevenueCat. These public stories do not establish either company's private screen/state-machine implementation. For Crittr, the resulting design is based on RevenueCat's actual SDK/backend documentation: stable authenticated identity, store-supplied packages/prices, one native purchase, entitlement verification, explicit restore, and webhook-driven server projection with reconciliation as recovery. The server projection also authorizes Crittr's paid database/API operations.

Primary implementation references:

- [RevenueCat overview](https://www.revenuecat.com/docs/welcome/overview) and [iOS setup](https://www.revenuecat.com/docs/getting-started/installation/ios).
- [Making purchases](https://www.revenuecat.com/docs/getting-started/making-purchases), [CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info), [restore behavior](https://www.revenuecat.com/docs/projects/restore-behavior), and [webhooks](https://www.revenuecat.com/docs/integrations/webhooks).
- [Apple TestFlight purchase environments](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testing-subscriptions-and-in-app-purchases-in-testflight/).
- [Expo Application environment API](https://docs.expo.dev/versions/latest/sdk/application/).

## Remaining release acceptance

Ship a new native build to receive the mobile fixes and environment notice. On a physical iPhone, verify monthly and annual, expired subscriber resubscription, cancellation, restore/reinstall, and network loss after confirmation. Confirm one store transaction, the expected RevenueCat customer/entitlement, a verified Pro profile and working paid features. Enroll the intended App Review account for sandbox tests.

A real-charge acceptance test must use the public App Store installation and a production Apple Account. This session did not submit an app release, complete an authenticated device checkout, or certify Apple agreements/product approval. TestFlight can validate the complete sandbox flow but cannot prove that a real payment was collected. See the existing [production-readiness audit](upgrade-production-readiness-audit-2026-10-29.md) for the external release checks.
