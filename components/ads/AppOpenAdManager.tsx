import { AdUnitIds, APP_OPEN_ADS_ENABLED } from "@/config/ads";
import { ensureTrackingConsent } from "@/lib/ads/trackingConsent";
import { useProfileQuery } from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useTrackingConsent } from "@/hooks/useTrackingConsent";
import {
  APP_OPEN_LAST_SHOWN_STORAGE_KEY,
  markAppOpenLastShownNow,
} from "@/lib/appOpenAdLastShown";
import { useAuthStore } from "@/stores/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState, type AppStateStatus, InteractionManager } from "react-native";
import mobileAds, { useAppOpenAd } from "react-native-google-mobile-ads";

/** Minimum time between app open ad impressions (relaxed in __DEV__ so you can test repeatedly). */
const MIN_APP_OPEN_INTERVAL_MS = __DEV__ ? 0 : 4 * 60 * 60 * 1000;

/**
 * Paywall and purchase routes. Checkout matters beyond the "don't cover the paywall" reason:
 * the store's payment sheet backgrounds the app, so a resume there reads as an ad served for
 * tapping "Get Crittr Pro".
 */
const AD_FREE_ROUTE_SEGMENTS = [
  "upgrade",
  "pro-checkout",
  "welcome-to-pro",
] as const;

/** Why an auto-show is allowed. Any other load (route change, post-dismiss reload) stays silent. */
type PendingShowReason = "cold_start" | "foreground";

/**
 * AdMob app open: full-screen when the app starts (first eligible load) and when returning
 * from the background, for signed-in, non–Crittr Pro users who have finished onboarding.
 * While `needsOnboarding` is true (sign-up → first-time setup), ads are suppressed so the
 * flow is not interrupted. The paywall and purchase routes are suppressed too.
 * Preloads the next ad after one is dismissed.
 */
export default function AppOpenAdManager() {
  const session = useAuthStore((s) => s.session);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const isLoggedIn = Boolean(session);
  const { data: profile, isPlaceholderData, isPending } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);
  const pathname = usePathname() ?? "";
  const onAdFreeRoute = AD_FREE_ROUTE_SEGMENTS.some((segment) =>
    pathname.includes(segment),
  );
  const { canRequestAds, personalizedAds } = useTrackingConsent();

  const canRequest =
    APP_OPEN_ADS_ENABLED &&
    canRequestAds &&
    isLoggedIn &&
    !needsOnboarding &&
    !isPro &&
    !isPending &&
    !isPlaceholderData &&
    !onAdFreeRoute;

  const adUnitId = canRequest ? AdUnitIds.appOpen : null;

  const requestOptions = useMemo(
    () => ({ requestNonPersonalizedAdsOnly: !personalizedAds }),
    [personalizedAds],
  );

  const { isLoaded, isClosed, isShowing, error, load, show } = useAppOpenAd(
    adUnitId,
    requestOptions,
  );

  const suppressAutoshowAfterPreload = useRef(false);
  const pendingShowReason = useRef<PendingShowReason | null>("cold_start");
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  /** Dedupes concurrent inits; matches `AdMobBootstrap` but guarantees `load()` runs after SDK is ready. */
  const initOnceRef = useRef<Promise<void> | null>(null);
  const ensureMobileAdsInitialized = useCallback(() => {
    if (!initOnceRef.current) {
      initOnceRef.current = ensureTrackingConsent()
        .then(() => mobileAds().initialize())
        .then(() => undefined)
        .catch((e) => {
          initOnceRef.current = null;
          throw e;
        });
    }
    return initOnceRef.current;
  }, []);

  const shouldThrottleShow = useCallback(async (): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(APP_OPEN_LAST_SHOWN_STORAGE_KEY);
      if (raw == null) return false;
      const last = Number.parseInt(raw, 10);
      if (Number.isNaN(last)) return false;
      return Date.now() - last < MIN_APP_OPEN_INTERVAL_MS;
    } catch {
      return false;
    }
  }, []);

  const markShown = useCallback(() => {
    void markAppOpenLastShownNow();
  }, []);

  const canRequestRef = useRef(canRequest);

  const tryShow = useCallback(async () => {
    if (!isLoaded || isShowing) return;
    /** Spent whether or not the throttle lets this one through — a skip, not a deferral. */
    pendingShowReason.current = null;
    if (await shouldThrottleShow()) return;
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => resolve());
    });
    /** Re-read eligibility: navigation onto an ad-free route can land during the wait. */
    if (!isLoaded || !canRequestRef.current) return;
    markShown();
    show();
  }, [isLoaded, isShowing, shouldThrottleShow, markShown, show]);

  // Latest tryShow for AppState + LOADED (avoid effect deps on tryShow — it changes with isShowing).
  const tryShowRef = useRef(tryShow);
  const loadRef = useRef(load);
  const isLoadedRef = useRef(isLoaded);
  useEffect(() => {
    tryShowRef.current = tryShow;
  }, [tryShow]);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);
  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);
  useEffect(() => {
    canRequestRef.current = canRequest;
  }, [canRequest]);

  // When eligibility is lost (e.g. Pro), reset foreground reload intent.
  useEffect(() => {
    if (!canRequest && pendingShowReason.current === "foreground") {
      pendingShowReason.current = null;
    }
  }, [canRequest]);

  // Resume: background (or inactive) -> active, matching react-native-google-mobile-ads / App Open guidance.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      const cameToForeground =
        (prev === "background" || prev === "inactive") && next === "active";
      appStateRef.current = next;
      if (!cameToForeground) return;
      if (!canRequestRef.current) return;
      pendingShowReason.current = "foreground";
      if (isLoadedRef.current) {
        void tryShowRef.current();
      } else {
        void ensureMobileAdsInitialized()
          .then(() => loadRef.current())
          .catch((e) => {
            if (__DEV__) {
              console.warn("[AppOpenAd] resume: init/load", e);
            }
          });
      }
    });
    return () => sub.remove();
  }, [ensureMobileAdsInitialized]);

  // Preload / reload when the user becomes eligible and after each dismiss.
  useEffect(() => {
    if (!canRequest) return;
    let cancelled = false;
    void ensureMobileAdsInitialized()
      .then(() => {
        if (cancelled) return;
        load();
      })
      .catch((e) => {
        if (__DEV__) {
          console.warn("[AppOpenAd] preload: init or load", e);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canRequest, load, adUnitId, ensureMobileAdsInitialized]);

  // After the user closes an app open ad, load the next one without showing it immediately.
  useEffect(() => {
    if (!isClosed || !canRequest) return;
    suppressAutoshowAfterPreload.current = true;
    let cancelled = false;
    void ensureMobileAdsInitialized()
      .then(() => {
        if (cancelled) return;
        load();
      })
      .catch((e) => {
        if (__DEV__) {
          console.warn("[AppOpenAd] reload after close", e);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isClosed, canRequest, load, ensureMobileAdsInitialized]);

  // A failed request should not leave "suppress" or pending show intent stuck.
  useEffect(() => {
    if (error) {
      if (__DEV__) {
        console.warn("[AppOpenAd] ad error", error);
      }
      suppressAutoshowAfterPreload.current = false;
      pendingShowReason.current = null;
    }
  }, [error]);

  // When an ad becomes loaded, show it only if a cold start or a foreground return is still
  // waiting on one. Requests also fire when eligibility returns — leaving the paywall or
  // checkout, say — and those must not turn into an impression.
  useEffect(() => {
    if (!isLoaded || !canRequest) return;
    if (suppressAutoshowAfterPreload.current) {
      suppressAutoshowAfterPreload.current = false;
      pendingShowReason.current = null;
      return;
    }
    if (!pendingShowReason.current) return;
    void tryShowRef.current();
  }, [isLoaded, canRequest]);
  return null;
}
