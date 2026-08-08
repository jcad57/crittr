/**
 * RevenueCat identifiers — must match the configuration in the RevenueCat
 * dashboard for Crittr Pro:
 *
 * - Entitlement id: `crittr_pro` (single entitlement granted by both monthly
 *   and annual subscription products). Must match
 *   `supabase/functions/_shared/revenueCatEntitlement.ts`.
 * - Offering id:    `default`    (the RC offering surfaced as `current` to the
 *   client, holds Monthly + Annual `PurchasesPackage` entries).
 * - Package types use the predefined RC `MONTHLY` / `ANNUAL` identifiers so we
 *   can read them off `offering.monthly` / `offering.annual` directly.
 *
 * Storefront product identifiers are configured in App Store Connect / Play
 * Console and live entirely in the store dashboards — RevenueCat maps them to
 * the entitlement above. Keep these helpful labels for logs and metadata only.
 */
export const CRITTR_PRO_ENTITLEMENT = "crittr_pro";
export const CRITTR_PRO_OFFERING = "default";
