import { rewritePetSwitchPath } from "@/utils/petScopedRouteRewrite";
import type { Href } from "expo-router";
import { usePathname } from "expo-router";
import { useCallback } from "react";

/**
 * For screens under `/pet/[id]/...`: after the user picks another pet in `PetNavAvatar`,
 * replace the route so `useLocalSearchParams().id` (and nested ids) stay consistent.
 *
 * Pass `replace` from the same {@link useNavigationCooldown} instance as the rest of the screen.
 */
export function usePetScopedAfterSwitchPet(
  currentPetId: string | undefined | null,
  replace: (href: Href) => void,
): (newPetId: string) => void {
  const pathname = usePathname() ?? "";

  return useCallback(
    (newPetId: string) => {
      if (!currentPetId) return;
      const next = rewritePetSwitchPath(pathname, currentPetId, newPetId);
      if (next) replace(next);
    },
    [pathname, currentPetId, replace],
  );
}
