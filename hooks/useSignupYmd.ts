import { useProfileQuery } from "@/hooks/queries/useProfileQuery";
import { useAuthStore } from "@/stores/authStore";
import { ymdFromIso } from "@/utils/scheduleDateRange";
import { useMemo } from "react";

/**
 * Local calendar day the user created their account.
 *
 * Prefers the auth session, which is resolved before the logged-in shell mounts
 * and so is available on the first frame; the profile row is a fallback for the
 * rare case the session omits it.
 */
export function useSignupYmd(): string | null {
  const sessionCreatedAt = useAuthStore((s) => s.session?.user?.created_at);
  const { data: profile } = useProfileQuery();

  return useMemo(
    () => ymdFromIso(sessionCreatedAt) ?? ymdFromIso(profile?.created_at),
    [sessionCreatedAt, profile?.created_at],
  );
}
