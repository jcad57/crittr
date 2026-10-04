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
>;

/** The only access decision: is the entitlement currently active? */
export function isCrittrProEntitlementActive(
  entitlement: Pick<CrittrProEntitlement, "isActive"> | null | undefined,
): boolean {
  return entitlement?.isActive === true;
}

/**
 * Server-side mirror of RevenueCat, used when CustomerInfo has not been
 * observed yet (cold start / offline). `crittr_pro_active` is the access flag.
 * `crittr_pro_until` is expiration metadata only — a null until with
 * `crittr_pro_active=true` is lifetime access, not "not Pro".
 *
 * Legacy rows that predate `crittr_pro_active` still fall back to
 * `crittr_pro_until > now()` so a cached profile cannot drop paying users
 * during rollout.
 */
export function isCrittrProFromProfile(
  profile: Pick<
    Profile,
    "crittr_pro_active" | "crittr_pro_until"
  > | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.crittr_pro_active === true) return true;
  if (profile.crittr_pro_active === false) return false;
  if (profile.crittr_pro_until == null) return false;
  return new Date(profile.crittr_pro_until) > new Date();
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
 * RevenueCat CustomerInfo is canonical once it has been observed. A later
 * failed fetch must not revoke a known-active entitlement. Until CustomerInfo
 * is observed, the Supabase mirror is the bootstrap fallback.
 */
export function resolveClientIsCrittrPro(
  customerInfoObserved: boolean,
  revenueCatEntitlement: CrittrProEntitlement | null,
  profile: Pick<
    Profile,
    "crittr_pro_active" | "crittr_pro_until"
  > | null | undefined,
): boolean {
  if (customerInfoObserved) {
    return isCrittrProEntitlementActive(revenueCatEntitlement);
  }
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
  return (
    active[CRITTR_PRO_ENTITLEMENT_ID] ??
    active[CRITTR_PRO_ENTITLEMENT_LEGACY_ID] ??
    null
  );
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
