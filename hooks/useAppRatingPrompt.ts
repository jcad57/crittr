import { runWhenIdle } from "@/lib/runWhenIdle";
import { trackAppRatingPromptShown } from "@/lib/analytics";
import { APP_OPEN_LAST_SHOWN_STORAGE_KEY } from "@/lib/appOpenAdLastShown";
import {
  ensureAppRatingFirstOpenRecorded,
  loadAppRatingState,
  snoozeAppRating,
} from "@/lib/appRatingPersistence";
import { requestStoreReview } from "@/lib/storeReview";
import { useAuthStore } from "@/stores/authStore";
import {
  isAppRatingCompleted,
  msUntilAppRatingEligible,
  shouldShowAppRatingPrompt,
  type AppRatingState,
} from "@/utils/appRatingSchedule";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

/** Let the dashboard paint (and app-open ads settle) before interrupting. */
const EVALUATE_DELAY_MS = 2800;
const RECENT_APP_OPEN_AD_MS = 45_000;

const BLOCKED_PATH_PARTS = [
  "upgrade",
  "pro-checkout",
  "welcome-to-pro",
  "make-pro-yours",
  "add-activity",
  "add-pet",
  "onboarding",
] as const;

/**
 * Process-wide lock so remounts / overlapping evaluate() calls can never
 * present two native review sheets. JS is single-threaded; this is claimed
 * synchronously after the last await on the show path.
 */
let nativeReviewClaimedThisProcess = false;

function pathIsBlocked(pathname: string): boolean {
  return BLOCKED_PATH_PARTS.some((part) => pathname.includes(part));
}

async function appOpenAdShownRecently(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(APP_OPEN_LAST_SHOWN_STORAGE_KEY);
    const ts = raw ? Number(raw) : NaN;
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < RECENT_APP_OPEN_AD_MS;
  } catch {
    return false;
  }
}

/**
 * Requests the OS in-app review sheet on the 24h / 7-day schedule.
 * Never renders a custom rating UI — that stacked with the native sheet.
 */
export function useAppRatingPrompt(): void {
  const pathname = usePathname() ?? "";
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [uiReady, setUiReady] = useState(false);
  const stateRef = useRef<AppRatingState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evaluateRef = useRef<() => void>(() => {});

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    void ensureAppRatingFirstOpenRecorded();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const task = runWhenIdle(() => {
      timeout = setTimeout(() => setUiReady(true), EVALUATE_DELAY_MS);
    });
    return () => {
      task.cancel();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const evaluate = useCallback(async () => {
    if (Platform.OS === "web") return;
    if (nativeReviewClaimedThisProcess) return;
    if (!uiReady || !isLoggedIn || needsOnboarding) return;
    if (pathIsBlocked(pathname)) return;
    if (AppState.currentState !== "active") return;

    const state =
      stateRef.current ??
      (await loadAppRatingState()) ??
      (await ensureAppRatingFirstOpenRecorded());
    stateRef.current = state;

    if (isAppRatingCompleted(state)) {
      clearTimer();
      return;
    }

    const remaining = msUntilAppRatingEligible(state, Date.now());
    if (remaining == null) {
      clearTimer();
      return;
    }

    if (remaining > 0) {
      clearTimer();
      timerRef.current = setTimeout(() => {
        void evaluateRef.current();
      }, remaining);
      return;
    }

    if (!shouldShowAppRatingPrompt(state, Date.now())) return;
    if (await appOpenAdShownRecently()) {
      clearTimer();
      timerRef.current = setTimeout(() => {
        void evaluateRef.current();
      }, RECENT_APP_OPEN_AD_MS);
      return;
    }

    /**
     * Claim before any further await so a second evaluate cannot also request
     * a review. Persist the 7-day snooze immediately: the OS sheet has no
     * "Not now" callback, so presenting it consumes this week's slot.
     */
    if (nativeReviewClaimedThisProcess) return;
    nativeReviewClaimedThisProcess = true;

    const now = Date.now();
    stateRef.current = { ...state, lastSnoozedAt: now };
    trackAppRatingPromptShown();
    try {
      const next = await snoozeAppRating(now);
      stateRef.current = next;
      await requestStoreReview();
    } catch {
      // Review is best-effort; the snooze still prevents a stacked retry.
    }
  }, [clearTimer, isLoggedIn, needsOnboarding, pathname, uiReady]);

  evaluateRef.current = () => {
    void evaluate();
  };

  useEffect(() => {
    void evaluate();
    return clearTimer;
  }, [clearTimer, evaluate]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void evaluateRef.current();
    });
    return () => sub.remove();
  }, []);
}
