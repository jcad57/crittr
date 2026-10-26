import {
  type CrittrProEntitlement,
  entitlementFromProfileMirror,
  isCrittrProEntitlementActive,
  type CrittrProProfileMirror,
} from "@/lib/crittrPro";
import { entitlementFromCustomerInfo } from "@/lib/iap/crittrProRevenueCat";
import type { CustomerInfo } from "react-native-purchases";

export type CrittrProClientState = {
  /**
   * True after at least one successful `CustomerInfo` read this process.
   * Failed subsequent reads leave this true so we do not revoke known Pro.
   */
  customerInfoObserved: boolean;
  entitlement: CrittrProEntitlement | null;
};

const INITIAL: CrittrProClientState = {
  customerInfoObserved: false,
  entitlement: null,
};

let snapshot: CrittrProClientState = INITIAL;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function replace(next: CrittrProClientState): void {
  if (
    snapshot.customerInfoObserved === next.customerInfoObserved &&
    snapshot.entitlement === next.entitlement
  ) {
    return;
  }
  snapshot = next;
  emit();
}

export function getCrittrProClientState(): CrittrProClientState {
  return snapshot;
}

export function subscribeCrittrProClientState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Apply a successful RevenueCat `CustomerInfo` payload. This is the client
 * source of truth: `entitlements.active.crittr_pro` decides Pro.
 */
export function ingestRevenueCatCustomerInfo(info: CustomerInfo): void {
  const entitlement = entitlementFromCustomerInfo(info);
  if (__DEV__) {
    console.log("[crittr-pro] CustomerInfo", {
      isActive: entitlement.isActive,
      expiresAt: entitlement.expiresAt,
      willRenew: entitlement.willRenew,
      store: entitlement.store,
      ownershipType: entitlement.ownershipType,
    });
  }
  replace({
    customerInfoObserved: true,
    entitlement,
  });
}

/**
 * CustomerInfo was unavailable (network, SDK not configured, timeout). Keep
 * whatever we already know — including a prior active entitlement.
 */
export function ingestCustomerInfoUnavailable(): void {
  if (__DEV__) {
    console.log("[crittr-pro] CustomerInfo unavailable; preserving", {
      observed: snapshot.customerInfoObserved,
      isActive: snapshot.entitlement?.isActive ?? null,
    });
  }
}

/** Bootstrap / fallback from the synced Supabase row when RC has not spoken yet. */
export function ingestProfileMirror(
  profile: CrittrProProfileMirror | null | undefined,
): void {
  if (snapshot.customerInfoObserved) return;
  const entitlement = entitlementFromProfileMirror(profile);
  replace({
    customerInfoObserved: false,
    entitlement,
  });
}

export function resetCrittrProClientState(): void {
  replace(INITIAL);
}

/** True when this process has observed an active Crittr Pro entitlement. */
export function clientHasUnlockedPro(): boolean {
  return (
    snapshot.customerInfoObserved &&
    isCrittrProEntitlementActive(snapshot.entitlement)
  );
}
