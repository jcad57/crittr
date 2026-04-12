/**
 * Central query key factories — no React hooks or store imports (avoids require cycles).
 */

export const profileQueryKey = (userId: string) =>
  ["profile", userId] as const;

export const subscriptionDetailsQueryKey = (userId: string) =>
  ["subscriptionDetails", userId] as const;

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

export const petMedicalRecordsQueryKey = (petId: string) =>
  ["petMedicalRecords", petId] as const;

export const petMedicalRecordDetailQueryKey = (recordId: string) =>
  ["petMedicalRecordDetail", recordId] as const;

export const petInsuranceFilesQueryKey = (petId: string) =>
  ["petInsuranceFiles", petId] as const;

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

// ─── Co-Care ─────────────────────────────────────────────────────────────────

export const coCarersForPetKey = (petId: string) =>
  ["coCarers", petId] as const;

export const sentInvitesForPetKey = (petId: string) =>
  ["sentInvites", petId] as const;

export const pendingInvitesKey = (userId: string) =>
  ["pendingInvites", userId] as const;

export const userPetPermissionsKey = (petId: string, userId: string) =>
  ["petPermissions", petId, userId] as const;

// ─── Notifications ───────────────────────────────────────────────────────────

export const notificationsKey = (userId: string) =>
  ["notifications", userId] as const;

export const unreadNotificationCountKey = (userId: string) =>
  ["notificationCount", userId] as const;

// ─── CrittrAI ────────────────────────────────────────────────────────────────

export const crittrAiThreadKey = (userId: string) =>
  ["crittrAi", "thread", userId] as const;
