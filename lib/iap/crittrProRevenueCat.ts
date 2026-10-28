import {
  customerInfoSliceHasCrittrPro,
  CRITTR_PRO_ENTITLEMENT_ID,
  CRITTR_PRO_ENTITLEMENT_LEGACY_ID,
  entitlementFromCustomerInfoSlice,
  type CrittrProEntitlement,
} from "@/lib/crittrPro";
import type {
  CustomerInfo,
  PurchasesEntitlementInfo,
} from "react-native-purchases";

/** Active Crittr Pro entitlement from `CustomerInfo` (checks canonical + legacy identifiers). */
export function customerInfoHasCrittrPro(info: CustomerInfo): boolean {
  return customerInfoSliceHasCrittrPro(info);
}

/** Select the same active grant as the access metadata, before historical purchases. */
export function selectCrittrProEntitlementFromCustomerInfo(
  info: CustomerInfo,
): PurchasesEntitlementInfo | null {
  const selected = entitlementFromCustomerInfoSlice(info);
  const active = [
    info.entitlements.active[CRITTR_PRO_ENTITLEMENT_ID],
    info.entitlements.active[CRITTR_PRO_ENTITLEMENT_LEGACY_ID],
  ].find(
    (ent) =>
      ent?.isActive &&
      ent.productIdentifier === selected.productIdentifier &&
      (ent.expirationDate ?? null) === selected.expiresAt,
  );
  return (
    active ??
    info.entitlements.all[CRITTR_PRO_ENTITLEMENT_ID] ??
    info.entitlements.all[CRITTR_PRO_ENTITLEMENT_LEGACY_ID] ??
    null
  );
}

/**
 * Map RevenueCat CustomerInfo onto the app entitlement model.
 *
 * Presence in `entitlements.active` is the access decision. `expirationDate`
 * may be null for lifetime / promotional grants and must not be treated as
 * inactive.
 */
export function entitlementFromCustomerInfo(
  info: CustomerInfo,
): CrittrProEntitlement {
  return entitlementFromCustomerInfoSlice(info);
}
