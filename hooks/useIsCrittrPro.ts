import { resolveClientIsCrittrPro } from "@/lib/crittrPro";
import {
  getCrittrProClientState,
  subscribeCrittrProClientState,
} from "@/lib/iap/crittrProClientState";
import type { Profile } from "@/types/database";
import { useSyncExternalStore } from "react";

/**
 * Crittr Pro entitlement for the current user.
 *
 * RevenueCat `CustomerInfo.entitlements.active.crittr_pro` is the client
 * source of truth once it has been observed. The Supabase profile mirror
 * (`crittr_pro_active`) is only the bootstrap / offline fallback — it is not
 * the definition of Pro, and `crittr_pro_until` is never used as an access
 * flag on its own.
 */
export function useIsCrittrPro(profile: Profile | null | undefined): boolean {
  const state = useSyncExternalStore(
    subscribeCrittrProClientState,
    getCrittrProClientState,
    getCrittrProClientState,
  );

  return resolveClientIsCrittrPro(
    state.customerInfoObserved,
    state.entitlement,
    profile ?? null,
  );
}
