import type { Profile } from "@/types/database";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SNAPSHOT_KEY = "crittr.authSnapshot";

/** Bump when `AuthSnapshot` changes shape so stale payloads are ignored, not applied. */
const SNAPSHOT_VERSION = 1;

/**
 * Beyond this the account may have changed enough (pets added on another
 * device, co-care revoked, onboarding finished elsewhere) that routing off a
 * remembered answer is more likely to be wrong than slow.
 */
const SNAPSHOT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthSnapshotState = {
  profile: Profile | null;
  hasPets: boolean;
  ownedPetCount: number;
  coCarePetCount: number;
  needsOnboarding: boolean;
  onboardingResumeStep: number | null;
  requiresCoCareRemovedScreen: boolean;
};

export type AuthSnapshot = AuthSnapshotState & {
  version: number;
  userId: string;
  resolvedAt: number;
};

/**
 * The last server-resolved onboarding answer for this user. Lets a returning
 * user boot straight to their tab instead of waiting on `resolveSession`; the
 * real resolve then runs in the background and corrects the store if needed.
 */
export async function readAuthSnapshot(
  userId: string,
): Promise<AuthSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthSnapshot>;
    if (parsed.version !== SNAPSHOT_VERSION) return null;
    if (parsed.userId !== userId) return null;
    if (typeof parsed.resolvedAt !== "number") return null;
    if (Date.now() - parsed.resolvedAt > SNAPSHOT_MAX_AGE_MS) return null;

    return parsed as AuthSnapshot;
  } catch {
    return null;
  }
}

export async function writeAuthSnapshot(
  userId: string,
  state: AuthSnapshotState,
): Promise<void> {
  const snapshot: AuthSnapshot = {
    ...state,
    version: SNAPSHOT_VERSION,
    userId,
    resolvedAt: Date.now(),
  };

  try {
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /** Snapshot is a launch-speed optimization; failing to save it is not fatal. */
  }
}

export async function clearAuthSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    /* nothing to recover from */
  }
}
