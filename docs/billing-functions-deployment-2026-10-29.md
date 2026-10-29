# Billing function redeployment — October 29, 2026

Project: **crittr** (`slnmfelxigtlrdyogsjn`), region `us-west-2`, reported `ACTIVE_HEALTHY` before deployment.

| Function | Previous version | Deployed version | Status |
| --- | --- | --- | --- |
| `sync-crittr-pro-entitlement` | 29 | 30 | ACTIVE |
| `revenuecat-webhook` | 9 | 10 | ACTIVE |
| `reconcile-crittr-pro-entitlements` | 2 | 3 | ACTIVE |

Deployed from an isolated temporary checkout containing only these handlers, their three shared billing modules, and function configuration. All three bundles include the audited provider-metadata guard: missing store/environment information cannot be classified as production access.

## Verification

- All three staged entry points passed `deno check`.
- The evaluator's 21 tests and 7 billing/database/webhook/worker regression tests passed.
- Supabase reported each deployed version ACTIVE.
- Each bundle was downloaded after deployment. Its handler and every shared dependency matched the staged source exactly by SHA-256 (3 files for sync, 4 for webhook, 3 for worker).
- All three live endpoints rejected both missing and invalid authorization with HTTP 401: six successful rejection checks.
- Existing `verify_jwt = false` settings were preserved. User sync still authenticates its caller through Supabase `auth.getUser()`; webhook and worker retain their configured authorization checks.
- Required secret names `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_WEBHOOK_AUTH`, and `ENTITLEMENT_RECONCILE_AUTH` are present. Secret values were not read or changed.
- The other 14 functions retained identical metadata before and after deployment. No database migration or mobile app release was performed.

This verifies deployment, source integrity, compilation, regression behavior, and authorization rejection. It does not replace an authenticated end-to-end sandbox purchase or real lifecycle webhook test. Those and the mobile release remain in the [production-readiness checklist](upgrade-production-readiness-audit-2026-10-29.md).
