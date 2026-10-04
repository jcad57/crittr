import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppRatingState } from "@/utils/appRatingSchedule";

export const APP_RATING_STORAGE_KEY = "crittr.appRating.v1";

const EMPTY_PARTIAL: AppRatingState = {
  firstOpenAt: 0,
  lastSnoozedAt: null,
  completedAt: null,
};

function parseState(raw: string | null): AppRatingState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AppRatingState>;
    if (typeof parsed.firstOpenAt !== "number" || !Number.isFinite(parsed.firstOpenAt)) {
      return null;
    }
    return {
      firstOpenAt: parsed.firstOpenAt,
      lastSnoozedAt:
        typeof parsed.lastSnoozedAt === "number" && Number.isFinite(parsed.lastSnoozedAt)
          ? parsed.lastSnoozedAt
          : null,
      completedAt:
        typeof parsed.completedAt === "number" && Number.isFinite(parsed.completedAt)
          ? parsed.completedAt
          : null,
    };
  } catch {
    return null;
  }
}

async function writeState(state: AppRatingState): Promise<void> {
  await AsyncStorage.setItem(APP_RATING_STORAGE_KEY, JSON.stringify(state));
}

export async function loadAppRatingState(): Promise<AppRatingState | null> {
  try {
    const raw = await AsyncStorage.getItem(APP_RATING_STORAGE_KEY);
    return parseState(raw);
  } catch {
    return null;
  }
}

/**
 * Records first launch once so the 24h clock starts at download/open, even
 * before the user signs in. Safe to call from multiple places.
 */
export async function ensureAppRatingFirstOpenRecorded(
  now = Date.now(),
): Promise<AppRatingState> {
  const existing = await loadAppRatingState();
  if (existing) return existing;
  const state: AppRatingState = {
    ...EMPTY_PARTIAL,
    firstOpenAt: now,
  };
  try {
    await writeState(state);
  } catch {
    // Still return the in-memory anchor so this session can schedule.
  }
  return state;
}

export async function snoozeAppRating(now = Date.now()): Promise<AppRatingState> {
  const current = await ensureAppRatingFirstOpenRecorded(now);
  if (current.completedAt != null) return current;
  const next: AppRatingState = { ...current, lastSnoozedAt: now };
  try {
    await writeState(next);
  } catch {
    // ignore
  }
  return next;
}

export async function completeAppRating(now = Date.now()): Promise<AppRatingState> {
  const current = await ensureAppRatingFirstOpenRecorded(now);
  const next: AppRatingState = { ...current, completedAt: now };
  try {
    await writeState(next);
  } catch {
    // ignore
  }
  return next;
}
