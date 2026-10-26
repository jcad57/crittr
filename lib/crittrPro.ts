import type { Profile } from "@/types/database";

/**
 * Canonical Crittr Pro entitlement snapshot.
 *
 * `isActive` and `expiresAt` are independent:
 *   - Active subscription:  isActive=true,  expiresAt=future, willRenew=true
 *   - Canceled but active:  isActive=true,  expiresAt=future, willRenew=false
 *   - Lifetime / promo:     isActive=true,  expiresAt=null,   willRenew=false
 *   - Expired:              isActive=false, expiresAt=past
 *
 * Access is `isActive`. Never infer Pro from a non-null expiration, willRenew,
 * or product identifier.
 */
export type CrittrProEntitlement = {
  isActive: boolean;
  /** ISO timestamp when access ends. `null` = no expiration (lifetime). */
  expiresAt: string | null;
  willRenew: boolean | null;
  store: string | null;
  productIdentifier: string | null;
  ownershipType: string | null;
  originalPurchaseDate: string | null;
  latestPurchaseDate: string | null;
  /** `revenuecat` = CustomerInfo; `profile_mirror` = last synced Supabase row. */
  source: "revenuecat" | "profile_mirror";
  lastSyncedAt: string | null;
};

export type CrittrProProfileMirror = Pick<
  Profile,
  | "crittr_pro_active"
  | "crittr_pro_until"
  | "subscription_will_renew"
  | "subscription_store"
  | "crittr_pro_product_id"
  | "crittr_pro_ownership_type"
  | "crittr_pro_last_synced_at"
  | "subscription_environment"
>;

export const PRO_VERIFICATION_MAX_AGE_MS = 72 * 60 * 60 * 1000;
type ProfileAccess = Pick<Profile, "crittr_pro_active" | "crittr_pro_until"> &
  Partial<
    Pick<Profile, "crittr_pro_last_synced_at" | "subscription_environment">
  >;
export function isCrittrProEntitlementActive(
  entitlement:
    | (Pick<CrittrProEntitlement, "isActive"> &
        Partial<Pick<CrittrProEntitlement, "expiresAt">>)
    | null
    | undefined,
  now = Date.now(),
): boolean {
  return (
    entitlement?.isActive === true &&
    (entitlement.expiresAt == null || Date.parse(entitlement.expiresAt) > now)
  );
}
export function proAccessDeadline(
  profile: ProfileAccess | null | undefined,
): number {
  if (
    !profile ||
    profile.crittr_pro_active !== true ||
    !["production", "sandbox", "promotional", "admin"].includes(
      profile.subscription_environment ?? "",
    )
  )
    return 0;
  const verified = Date.parse(profile.crittr_pro_last_synced_at ?? "");
  const expiry =
    profile.crittr_pro_until == null
      ? Infinity
      : Date.parse(profile.crittr_pro_until);
  if (profile.subscription_environment === "admin" && !Number.isFinite(expiry))
    return 0;
  return Number.isFinite(verified) && !Number.isNaN(expiry)
    ? Math.min(
        expiry,
        profile.subscription_environment === "admin"
          ? Infinity
          : verified + PRO_VERIFICATION_MAX_AGE_MS,
      )
    : 0;
}
/** The verified server projection also authorizes paid database/API actions. */
export function isCrittrProFromProfile(
  profile: ProfileAccess | null | undefined,
  now = Date.now(),
): boolean {
  return proAccessDeadline(profile) > now;
}

export function entitlementFromProfileMirror(
  profile: CrittrProProfileMirror | null | undefined,
): CrittrProEntitlement | null {
  if (!profile) return null;
  const isActive = isCrittrProFromProfile(profile);
  return {
    isActive,
    expiresAt: profile.crittr_pro_until ?? null,
    willRenew: profile.subscription_will_renew ?? false,
    store: profile.subscription_store ?? null,
    productIdentifier: profile.crittr_pro_product_id ?? null,
    ownershipType: profile.crittr_pro_ownership_type ?? null,
    originalPurchaseDate: null,
    latestPurchaseDate: null,
    source: "profile_mirror",
    lastSyncedAt: profile.crittr_pro_last_synced_at ?? null,
  };
}

/**
 * Client access decision.
 *
 * The server projection is also used by database and API authorization.
 * Native CustomerInfo is purchase metadata and never a feature-access override.
 */
export function resolveClientIsCrittrPro(
  customerInfoObserved: boolean,
  revenueCatEntitlement: CrittrProEntitlement | null,
  profile: ProfileAccess | null | undefined,
): boolean {
  return isCrittrProFromProfile(profile);
}

/** Must match `config/iap.ts` and RevenueCat dashboard entitlement id. */
export const CRITTR_PRO_ENTITLEMENT_ID = "crittr_pro";
/** Legacy mis-label; keep until all RC projects use identifier `crittr_pro`. */
export const CRITTR_PRO_ENTITLEMENT_LEGACY_ID = "Crittr Pro";

export type CustomerInfoEntitlementFields = {
  isActive?: boolean;
  expirationDate?: string | null;
  willRenew?: boolean;
  store?: string | null;
  productIdentifier?: string | null;
  ownershipType?: string | null;
  originalPurchaseDate?: string | null;
  latestPurchaseDate?: string | null;
};

/** Duck-typed CustomerInfo slice so access checks can be unit-tested without the SDK. */
export type CustomerInfoEntitlementSlice = {
  entitlements: {
    active: Record<string, CustomerInfoEntitlementFields | undefined>;
    all?: Record<string, CustomerInfoEntitlementFields | undefined>;
  };
};

function pickActiveFromSlice(
  info: CustomerInfoEntitlementSlice,
): CustomerInfoEntitlementFields | null {
  const active = info.entitlements.active;
  return active[CRITTR_PRO_ENTITLEMENT_ID] ?? null;
}

export function customerInfoSliceHasCrittrPro(
  info: CustomerInfoEntitlementSlice,
): boolean {
  return Boolean(pickActiveFromSlice(info)?.isActive);
}

export function entitlementFromCustomerInfoSlice(
  info: CustomerInfoEntitlementSlice,
): CrittrProEntitlement {
  const active = pickActiveFromSlice(info);
  const all = info.entitlements.all ?? {};
  const historical =
    all[CRITTR_PRO_ENTITLEMENT_ID] ??
    all[CRITTR_PRO_ENTITLEMENT_LEGACY_ID] ??
    null;
  const ent = active ?? historical;
  const now = new Date().toISOString();

  if (!ent) {
    return {
      isActive: false,
      expiresAt: null,
      willRenew: null,
      store: null,
      productIdentifier: null,
      ownershipType: null,
      originalPurchaseDate: null,
      latestPurchaseDate: null,
      source: "revenuecat",
      lastSyncedAt: now,
    };
  }

  return {
    isActive: Boolean(active?.isActive),
    expiresAt: ent.expirationDate ?? null,
    willRenew: ent.willRenew ?? null,
    store: ent.store ?? null,
    productIdentifier: ent.productIdentifier ?? null,
    ownershipType: ent.ownershipType ?? null,
    originalPurchaseDate: ent.originalPurchaseDate ?? null,
    latestPurchaseDate: ent.latestPurchaseDate ?? null,
    source: "revenuecat",
    lastSyncedAt: now,
  };
}
