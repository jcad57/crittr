import { prefetchPetsList } from "@/hooks/queries/prefetchPetsAndDetails";
import { queryClient } from "@/lib/query/client";

/** Warm only the visible shell; detail queries follow the selected pet. */
export function prefetchLoggedInSessionData(userId: string): Promise<void> {
  return prefetchPetsList(queryClient, userId);
}
