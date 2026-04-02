import { isCrittrProFromProfile } from "@/lib/crittrPro";
import { useCrittrProStore } from "@/stores/crittrProStore";
import type { Profile } from "@/types/database";

/**
 * True when Supabase profile has active Pro OR mock Pro is enabled (upgrade flow testing).
 */
export function useIsCrittrPro(profile: Profile | null | undefined): boolean {
  const isMockPro = useCrittrProStore((s) => s.isMockPro);
  return isMockPro || isCrittrProFromProfile(profile ?? null);
}
