import { profileQueryKey } from "@/lib/query/keys";
import { useProfileQuery } from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { isCrittrProFromProfile } from "@/lib/crittrPro";
import {
  ingestCustomerInfoUnavailable,
  ingestRevenueCatCustomerInfo,
} from "@/lib/iap/crittrProClientState";
import { customerInfoHasCrittrPro } from "@/lib/iap/crittrProRevenueCat";
import { getIdentifiedRevenueCatCustomerInfo } from "@/lib/iap/revenueCat";
import { UPGRADE_HREF } from "@/utils/proUpgradePaths";
import { fetchProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Pro check + navigation to the upgrade screen when a feature is gated.
 *
 * Revalidates against identified RevenueCat CustomerInfo before denying so a
 * lagging `profiles` mirror (lifetime grant, restore, other-device purchase)
 * never mis-routes a paying member to upgrade. If CustomerInfo is unavailable,
 * fall back to the synced `crittr_pro_active` mirror — do not revoke known Pro.
 */
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

    try {
      const info = await getIdentifiedRevenueCatCustomerInfo(uid);
      if (info) {
        ingestRevenueCatCustomerInfo(info);
        return customerInfoHasCrittrPro(info);
      }
      ingestCustomerInfoUnavailable();
    } catch {
      ingestCustomerInfoUnavailable();
    }

    const fresh = await queryClient.fetchQuery({
      queryKey: profileQueryKey(uid),
      queryFn: () => fetchProfile(uid),
    });
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
   * Always revalidates Pro from RevenueCat first so cached profile rows cannot wrongly gate Pro users.
   */
  const runWithProOrUpgrade = useCallback(
    async (allowed: () => void, onDenied?: () => void): Promise<boolean> => {
      const hasPro = await resolveProFromServer();
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
