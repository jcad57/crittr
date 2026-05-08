import { CRITTR_PRO_ENTITLEMENT } from "@/constants/iap";
import type {
  CustomerInfo,
  PurchasesEntitlementInfo,
} from "react-native-purchases";

/** Matches legacy client bug / mis-named RC entitlement identifier. */
const CRITTR_PRO_ENTITLEMENT_LEGACY = "Crittr Pro";

/** Active Crittr Pro entitlement from `CustomerInfo` (checks canonical + legacy identifiers). */
export function customerInfoHasCrittrPro(info: CustomerInfo): boolean {
  const active = info.entitlements.active;
  return Boolean(
    active[CRITTR_PRO_ENTITLEMENT]?.isActive ||
      active[CRITTR_PRO_ENTITLEMENT_LEGACY]?.isActive,
  );
}

/** Prefer `active`, then historical `all` — canonical id first for new projects. */
export function selectCrittrProEntitlementFromCustomerInfo(
  info: CustomerInfo,
): PurchasesEntitlementInfo | null {
  return (
    info.entitlements.active[CRITTR_PRO_ENTITLEMENT] ??
    info.entitlements.all[CRITTR_PRO_ENTITLEMENT] ??
    info.entitlements.active[CRITTR_PRO_ENTITLEMENT_LEGACY] ??
    info.entitlements.all[CRITTR_PRO_ENTITLEMENT_LEGACY] ??
    null
  );
}
