import { profileQueryKey } from "@/hooks/queries/queryKeys";
import { useProfileQuery } from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { isCrittrProFromProfile } from "@/lib/crittrPro";
import { UPGRADE_HREF } from "@/lib/proUpgradePaths";
import { fetchProfile } from "@/services/profiles";
import { useCrittrProStore } from "@/stores/crittrProStore";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Profile-backed Pro check + navigation to the upgrade screen when a feature is gated.
 * Uses a server-backed profile fetch before denying Pro so Zustand/React Query placeholders
 * (missing `crittr_pro_until`) never mis-route paying members to upgrade.
 */
export function useProGateNavigation() {
  const queryClient = useQueryClient();
  const { data: profile, isPlaceholderData } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);
  const isMockPro = useCrittrProStore((s) => s.isMockPro);
  const { push, replace } = useNavigationCooldown();

  /** True after the first successful `profiles` fetch for this session (not Zustand-only placeholder). */
  const isProfileReady = !isPlaceholderData;

  const resolveProFromServer = useCallback(async (): Promise<boolean> => {
    if (isMockPro) return true;
    const uid = useAuthStore.getState().session?.user?.id;
    if (!uid) return false;
    const fresh = await queryClient.fetchQuery({
      queryKey: profileQueryKey(uid),
      queryFn: () => fetchProfile(uid),
    });
    return isCrittrProFromProfile(fresh);
  }, [queryClient, isMockPro]);

  const goToUpgrade = useCallback(() => {
    push(UPGRADE_HREF);
  }, [push]);

  const replaceWithUpgrade = useCallback(() => {
    replace(UPGRADE_HREF);
  }, [replace]);

  /**
   * Runs `allowed` only if the user has Pro; otherwise opens the upgrade screen.
   * Always revalidates Pro from the server first so cached profile rows cannot wrongly gate Pro users.
   */
  const runWithProOrUpgrade = useCallback(
    async (allowed: () => void): Promise<boolean> => {
      const hasPro = await resolveProFromServer();
      if (hasPro) {
        allowed();
        return true;
      }
      push(UPGRADE_HREF);
      return false;
    },
    [resolveProFromServer, push],
  );

  /**
   * For “add another” flows: first item is free; additional rows require Pro.
   */
  const canAddAnotherOrUpgrade = useCallback(
    async (existingCount: number, goAdd: () => void): Promise<boolean> => {
      if (existingCount === 0) {
        goAdd();
        return true;
      }
      return runWithProOrUpgrade(goAdd);
    },
    [runWithProOrUpgrade],
  );

  return {
    isPro,
    isProfileReady,
    profile,
    goToUpgrade,
    replaceWithUpgrade,
    runWithProOrUpgrade,
    canAddAnotherOrUpgrade,
  };
}
