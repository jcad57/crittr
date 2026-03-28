/**
 * Central query key factories — no React hooks or store imports (avoids require cycles).
 */

export const profileQueryKey = (userId: string) =>
  ["profile", userId] as const;

export const petsQueryKey = (ownerId: string) => ["pets", ownerId] as const;

export const petDetailsQueryKey = (petId: string) =>
  ["petDetails", petId] as const;

export const healthSnapshotKey = (ownerId: string) =>
  ["healthSnapshot", ownerId] as const;

export const petVetVisitsQueryKey = (petId: string) =>
  ["petVetVisits", petId] as const;
