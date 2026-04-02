import { usePetsQuery } from "@/hooks/queries";
import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * Redirects away from `/pet/:id` routes when this pet is no longer in the
 * accessible pets list (e.g. co-carer removed). Pet list is the source of
 * truth; pet details cache may still hold stale data briefly.
 */
export function usePetAccessGuard(petId: string | undefined) {
  const router = useRouter();
  const { data: accessiblePets, isSuccess: petsListReady } = usePetsQuery();

  useEffect(() => {
    if (!petId || !petsListReady) return;
    const stillAllowed = accessiblePets?.some((p) => p.id === petId) ?? false;
    if (!stillAllowed) {
      router.replace("/(logged-in)/dashboard");
    }
  }, [petId, petsListReady, accessiblePets, router]);
}
