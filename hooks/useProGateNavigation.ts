import type { Profile } from "@/types/database";
import { profileQueryKey } from "@/lib/query/keys";
import { useProfileQuery } from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { isCrittrProFromProfile } from "@/lib/crittrPro";
import { UPGRADE_HREF } from "@/utils/proUpgradePaths";
import { fetchProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { Alert } from "react-native";
import { sessionGeneration } from "@/lib/sessionGeneration";
import { syncCrittrProForSession } from "@/lib/iap/entitlementSync";

/** Use the verified profile lease; reconcile before denying a stale/missing entitlement. */
export function useProGateNavigation() {
  const queryClient = useQueryClient();
  const { data: profile, isPlaceholderData } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);
  const { push, replace } = useNavigationCooldown();

  /** True after the first successful `profiles` fetch for this session (not Zustand-only placeholder). */
  const isProfileReady = !isPlaceholderData;

  const resolveProFromServer = useCallback(async (): Promise<boolean> => {
    const uid = useAuthStore.getState().session?.user?.id;
    if (!uid) return false;

    const generation = sessionGeneration();
    const cached = queryClient.getQueryData<Profile>(profileQueryKey(uid));
    if (isCrittrProFromProfile(cached)) return true;
    let fresh = await queryClient.fetchQuery({
      queryKey: profileQueryKey(uid),
      queryFn: () => fetchProfile(uid),
      staleTime: 0,
    });
    if (!isCrittrProFromProfile(fresh)) {
      const result = await syncCrittrProForSession(uid);
      if (result !== "synced")
        throw new Error("Subscription verification unavailable");
      if (generation !== sessionGeneration())
        throw new Error("Your account changed");
      fresh = await queryClient.fetchQuery({
        queryKey: profileQueryKey(uid),
        queryFn: () => fetchProfile(uid),
        staleTime: 0,
      });
    }
    if (generation !== sessionGeneration())
      throw new Error("Your account changed");
    return isCrittrProFromProfile(fresh);
  }, [queryClient]);

  const goToUpgrade = useCallback(() => {
    push(UPGRADE_HREF);
  }, [push]);

  const replaceWithUpgrade = useCallback(() => {
    replace(UPGRADE_HREF);
  }, [replace]);

  /**
   * Runs `allowed` only if the user has Pro; otherwise opens the upgrade screen
   * (or `onDenied` when provided — used for contextual soft paywalls).
   * Recent verified access works offline; missing access is checked with the server before upgrade.
   */
  const runWithProOrUpgrade = useCallback(
    async (allowed: () => void, onDenied?: () => void): Promise<boolean> => {
      let hasPro: boolean;
      try {
        hasPro = await resolveProFromServer();
      } catch {
        Alert.alert(
          "Could not verify subscription",
          "Check your connection and try again.",
        );
        return false;
      }
      if (hasPro) {
        allowed();
        return true;
      }
      if (onDenied) {
        onDenied();
      } else {
        push(UPGRADE_HREF);
      }
      return false;
    },
    [resolveProFromServer, push],
  );

  /**
   * For “add another” flows: first item is free; additional rows require Pro.
   */
  const canAddAnotherOrUpgrade = useCallback(
    async (
      existingCount: number,
      goAdd: () => void,
      onDenied?: () => void,
    ): Promise<boolean> => {
      if (existingCount === 0) {
        goAdd();
        return true;
      }
      return runWithProOrUpgrade(goAdd, onDenied);
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
