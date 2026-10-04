import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "crittr.proEngagement.v1.";

export type ProEngagementState = {
  celebratedByPet: Record<string, number[]>;
  lastShownAt: number | null;
  suppressUntil: number | null;
  onboardingCompleted: boolean;
};

const EMPTY: ProEngagementState = {
  celebratedByPet: {},
  lastShownAt: null,
  suppressUntil: null,
  onboardingCompleted: false,
};

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function parseState(raw: string | null): ProEngagementState {
  if (!raw) return { ...EMPTY, celebratedByPet: {} };
  try {
    const parsed = JSON.parse(raw) as Partial<ProEngagementState>;
    return {
      celebratedByPet:
        parsed.celebratedByPet && typeof parsed.celebratedByPet === "object"
          ? parsed.celebratedByPet
          : {},
      lastShownAt:
        typeof parsed.lastShownAt === "number" ? parsed.lastShownAt : null,
      suppressUntil:
        typeof parsed.suppressUntil === "number" ? parsed.suppressUntil : null,
      onboardingCompleted: parsed.onboardingCompleted === true,
    };
  } catch {
    return { ...EMPTY, celebratedByPet: {} };
  }
}

export async function loadProEngagementState(
  userId: string,
): Promise<ProEngagementState> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    return parseState(raw);
  } catch {
    return { ...EMPTY, celebratedByPet: {} };
  }
}

async function writeProEngagementState(
  userId: string,
  state: ProEngagementState,
): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(state));
}

export async function markMilestoneCelebrated(input: {
  userId: string;
  petId: string;
  milestone: number;
}): Promise<void> {
  const state = await loadProEngagementState(input.userId);
  const prev = state.celebratedByPet[input.petId] ?? [];
  if (!prev.includes(input.milestone)) {
    state.celebratedByPet[input.petId] = [...prev, input.milestone];
  }
  state.lastShownAt = Date.now();
  await writeProEngagementState(input.userId, state);
}

export async function suppressProCelebrationsUntil(
  userId: string,
  untilMs: number,
): Promise<void> {
  const state = await loadProEngagementState(userId);
  state.suppressUntil = Math.max(state.suppressUntil ?? 0, untilMs);
  await writeProEngagementState(userId, state);
}

export async function markProOnboardingCompleted(
  userId: string,
): Promise<void> {
  const state = await loadProEngagementState(userId);
  state.onboardingCompleted = true;
  await writeProEngagementState(userId, state);
}

export function isCelebrationSuppressed(
  state: ProEngagementState,
  now = Date.now(),
): boolean {
  return state.suppressUntil != null && state.suppressUntil > now;
}
