/**
 * Central query key factories — no React hooks or store imports (avoids require cycles).
 */

export const profileQueryKey = (userId: string) =>
  ["profile", userId] as const;

/** Sorted ids string for stable cache keys. */
export const profilesByIdsQueryKey = (sortedUserIds: string[]) =>
  ["profiles", "byIds", sortedUserIds.join(",")] as const;

export const petsQueryKey = (ownerId: string) => ["pets", ownerId] as const;

export const petDetailsQueryKey = (petId: string) =>
  ["petDetails", petId] as const;

export const healthSnapshotKey = (ownerId: string) =>
  ["healthSnapshot", ownerId] as const;

export const petVetVisitsQueryKey = (petId: string) =>
  ["petVetVisits", petId] as const;

/** Includes local calendar day so caches roll forward at local midnight. */
export const todayActivitiesKey = (petId: string, localYmd: string) =>
  ["todayActivities", petId, localYmd] as const;

/** Prefix match for invalidating all today caches for a pet (any local day). */
export const todayActivitiesPrefixKey = (petId: string) =>
  ["todayActivities", petId] as const;

/** Stable key for today's activities across multiple pets (sorted ids). */
export const todayActivitiesForPetIdsKey = (
  petIds: string[],
  localYmd: string,
) =>
  [
    "todayActivities",
    "multi",
    [...petIds].sort().join(","),
    localYmd,
  ] as const;

export const todayActivitiesForPetIdsPrefixKey = (petIds: string[]) =>
  ["todayActivities", "multi", [...petIds].sort().join(",")] as const;

export const allActivitiesKey = (petId: string) =>
  ["allActivities", petId] as const;

export const petActivityQueryKey = (activityId: string) =>
  ["petActivity", activityId] as const;
