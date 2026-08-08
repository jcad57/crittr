import { isCrittrProFromProfile } from "@/lib/crittrPro";
import type { Profile } from "@/types/database";

/**
 * Crittr Pro entitlement for the current profile. `profile.crittr_pro_until`
 * (driven by RevenueCat) is the source of truth.
 */
export function useIsCrittrPro(profile: Profile | null | undefined): boolean {
  return isCrittrProFromProfile(profile ?? null);
}
