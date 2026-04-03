import { useProfileQuery } from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { UPGRADE_HREF } from "@/lib/proUpgradePaths";
import { useCallback } from "react";

/**
 * Profile-backed Pro check + navigation to the upgrade screen when a feature is gated.
 */
export function useProGateNavigation() {
  const { data: profile } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);
  const { push, replace } = useNavigationCooldown();

  const goToUpgrade = useCallback(() => {
    push(UPGRADE_HREF);
  }, [push]);

  const replaceWithUpgrade = useCallback(() => {
    replace(UPGRADE_HREF);
  }, [replace]);

  /**
   * Runs `allowed` only if the user has Pro; otherwise opens the upgrade screen.
   * @returns true if `allowed` was run, false if routed to upgrade.
   */
  const runWithProOrUpgrade = useCallback(
    (allowed: () => void): boolean => {
      if (isPro) {
        allowed();
        return true;
      }
      push(UPGRADE_HREF);
      return false;
    },
    [isPro, push],
  );

  /**
   * For “add another” flows: first item is free; additional rows require Pro.
   */
  const canAddAnotherOrUpgrade = useCallback(
    (existingCount: number, goAdd: () => void): boolean => {
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
    profile,
    goToUpgrade,
    replaceWithUpgrade,
    runWithProOrUpgrade,
    canAddAnotherOrUpgrade,
  };
}
