import { useActivityMonthCountQuery } from "@/hooks/queries/useActivityMonthCountQuery";
import { usePetsQuery } from "@/hooks/queries/usePetsQuery";
import { useProfileQuery } from "@/hooks/queries/useProfileQuery";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { APP_OPEN_LAST_SHOWN_STORAGE_KEY } from "@/lib/appOpenAdLastShown";
import { trackProEvent } from "@/lib/proEvents";
import {
  isCelebrationSuppressed,
  loadProEngagementState,
  markMilestoneCelebrated,
  type ProEngagementState,
} from "@/lib/proEngagementPersistence";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import { pickUncelebratedMilestone } from "@/utils/activityMilestones";
import { isPetActiveForDashboard } from "@/utils/petParticipation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, InteractionManager } from "react-native";

/** Don't celebrate more often than this, even across different pets. */
const MIN_GAP_MS = 14 * 24 * 60 * 60 * 1000;
const EVALUATE_DELAY_MS = 2800;
const RECENT_APP_OPEN_AD_MS = 45_000;

const BLOCKED_PATH_PARTS = [
  "upgrade",
  "pro-checkout",
  "welcome-to-pro",
  "add-activity",
  "add-pet",
  "onboarding",
] as const;

export type ActivityMilestoneOffer = {
  petId: string;
  petName: string;
  petAvatarUrl: string | null;
  milestone: number;
  activityCount: number;
};

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

export function useActivityMilestoneCelebration(): {
  offer: ActivityMilestoneOffer | null;
  dismiss: () => void;
  completeShown: () => void;
} {
  const pathname = usePathname() ?? "";
  const userId = useAuthStore((s) => s.session?.user?.id);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const { data: profile, isPlaceholderData, isPending } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);
  const { data: pets } = usePetsQuery();
  const activePetId = usePetStore((s) => s.activePetId);

  const ownedLiving = useMemo(() => {
    if (!pets) return [];
    return pets.filter(
      (p) => p.role === "owner" && isPetActiveForDashboard(p),
    );
  }, [pets]);

  const targetPet = useMemo(() => {
    if (ownedLiving.length === 0) return null;
    return (
      ownedLiving.find((p) => p.id === activePetId) ?? ownedLiving[0] ?? null
    );
  }, [ownedLiving, activePetId]);

  const [uiReady, setUiReady] = useState(false);
  const [engagement, setEngagement] = useState<ProEngagementState | null>(null);
  const [offer, setOffer] = useState<ActivityMilestoneOffer | null>(null);
  const shownThisSession = useRef(false);
  const persistedRef = useRef(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      timeout = setTimeout(() => setUiReady(true), EVALUATE_DELAY_MS);
    });
    return () => {
      task.cancel();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setEngagement(null);
      return;
    }
    let cancelled = false;
    void loadProEngagementState(userId).then((state) => {
      if (!cancelled) setEngagement(state);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const countEnabled =
    uiReady &&
    !isPro &&
    !isPlaceholderData &&
    !isPending &&
    !needsOnboarding &&
    !!targetPet &&
    !pathIsBlocked(pathname) &&
    AppState.currentState === "active";

  const { data: monthCount } = useActivityMonthCountQuery(
    targetPet?.id,
    countEnabled,
  );

  useEffect(() => {
    if (offer || shownThisSession.current) return;
    if (!countEnabled || engagement == null) return;
    if (typeof monthCount !== "number" || !targetPet || !userId) return;
    if (isCelebrationSuppressed(engagement)) return;
    if (
      engagement.lastShownAt != null &&
      Date.now() - engagement.lastShownAt < MIN_GAP_MS
    ) {
      return;
    }

    const celebrated = engagement.celebratedByPet[targetPet.id] ?? [];
    const milestone = pickUncelebratedMilestone(monthCount, celebrated);
    if (milestone == null) return;

    let cancelled = false;
    void appOpenAdShownRecently().then((recentAd) => {
      if (cancelled || recentAd) return;
      if (shownThisSession.current) return;
      shownThisSession.current = true;
      setOffer({
        petId: targetPet.id,
        petName: targetPet.name,
        petAvatarUrl: targetPet.avatar_url,
        milestone,
        activityCount: monthCount,
      });
      persistedRef.current = true;
      void markMilestoneCelebrated({
        userId,
        petId: targetPet.id,
        milestone,
      });
      trackProEvent("pro_progress_celebration_shown", {
        milestone,
        count: monthCount,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    countEnabled,
    engagement,
    monthCount,
    offer,
    targetPet,
    userId,
  ]);

  const dismiss = useCallback(() => {
    trackProEvent("pro_progress_celebration_dismissed", {
      milestone: offer?.milestone ?? 0,
    });
    setOffer(null);
  }, [offer?.milestone]);

  const completeShown = useCallback(() => {
    setOffer(null);
  }, []);

  return { offer, dismiss, completeShown };
}
