import type { Profile } from "@/types/database";

/**
 * Crittr Pro is active when `crittr_pro_until` is set and still in the future.
 * Mirrors `public.user_has_crittr_pro()` in Supabase.
 */
export function isCrittrProFromProfile(
  profile: Pick<Profile, "crittr_pro_until"> | null | undefined,
): boolean {
  if (profile?.crittr_pro_until == null) return false;
  return new Date(profile.crittr_pro_until) > new Date();
}
