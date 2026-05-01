/**
 * Pet profile sections that have detail routes (`/pet/:id/<section>/:childId`).
 * When switching pets, we navigate to the section list for the new pet — not the old child id.
 */
const PET_SCOPED_DETAIL_SECTIONS = new Set([
  "medical-records",
  "medications",
  "vaccinations",
  "vet-visits",
  "food",
]);

export function truncatePetScopedRest(rest: string[]): string[] {
  if (
    rest.length >= 2 &&
    PET_SCOPED_DETAIL_SECTIONS.has(rest[0])
  ) {
    return [rest[0]];
  }
  return rest;
}

/**
 * Rewrites the current URL’s pet id and drops stale detail segments (e.g. another pet’s record id).
 * Expects Expo `usePathname()` shapes like `/pet/<petId>/...`.
 */
export function rewritePetSwitchPath(
  pathname: string | undefined | null,
  oldPetId: string,
  newPetId: string,
): string | null {
  if (!pathname?.trim() || !oldPetId || !newPetId || oldPetId === newPetId) {
    return null;
  }

  const pathOnly = pathname.split("?")[0].replace(/\/$/, "");
  const parts = pathOnly.split("/").filter(Boolean);
  const petIdx = parts.indexOf("pet");
  if (petIdx === -1 || petIdx + 1 >= parts.length) return null;

  if (parts[petIdx + 1] !== oldPetId) return null;

  const prefix = parts.slice(0, petIdx);
  const rest = parts.slice(petIdx + 2);
  const truncated = truncatePetScopedRest(rest);
  const rebuilt = [...prefix, "pet", newPetId, ...truncated];
  return `/${rebuilt.join("/")}`;
}
