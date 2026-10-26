import {
  type CrittrProEntitlement,
  entitlementFromProfileMirror,
  isCrittrProFromProfile,
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
let verifiedProfile: CrittrProProfileMirror | null = null;
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

export function subscribeCrittrProClientState(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Keep native purchase metadata for checkout diagnostics. Feature access is
 * decided by the independently verified server projection.
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

/** Save the verified profile independently from native purchase metadata. */
export function ingestProfileMirror(
  profile: CrittrProProfileMirror | null | undefined,
): void {
  verifiedProfile = profile ?? null;
  if (snapshot.customerInfoObserved) return;
  const entitlement = entitlementFromProfileMirror(profile);
  replace({
    customerInfoObserved: false,
    entitlement,
  });
}

export function resetCrittrProClientState(): void {
  verifiedProfile = null;
  replace(INITIAL);
}

/** Compatibility helper for checkout watchdogs; requires verified server access. */
export function clientHasUnlockedPro(): boolean {
  return isCrittrProFromProfile(verifiedProfile);
}
