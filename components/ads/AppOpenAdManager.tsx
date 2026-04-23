import { AdUnitIds, APP_OPEN_ADS_ENABLED } from "@/constants/ads";
import { useProfileQuery } from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useAuthStore } from "@/stores/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import mobileAds, { useAppOpenAd } from "react-native-google-mobile-ads";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus, InteractionManager } from "react-native";

const APP_OPEN_LAST_SHOWN_KEY = "crittr_ad_app_open_last_shown_ms";

/** Minimum time between app open ad impressions (relaxed in __DEV__ so you can test repeatedly). */
const MIN_APP_OPEN_INTERVAL_MS = __DEV__ ? 0 : 4 * 60 * 60 * 1000;

const requestOptions = {
  requestNonPersonalizedAdsOnly: false,
} as const;

/**
 * AdMob app open: full-screen when the app starts (first eligible load) and when returning
 * from the background, for signed-in, non–Crittr Pro users. Preloads the next ad after one is dismissed.
 */
export default function AppOpenAdManager() {
  const session = useAuthStore((s) => s.session);
  const isLoggedIn = Boolean(session);
  const { data: profile, isPlaceholderData, isPending } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);

  const canRequest =
    APP_OPEN_ADS_ENABLED &&
    isLoggedIn &&
    !isPro &&
    !isPending &&
    !isPlaceholderData;

  const adUnitId = canRequest ? AdUnitIds.appOpen : null;

  const { isLoaded, isClosed, isShowing, error, load, show } = useAppOpenAd(
    adUnitId,
    requestOptions,
  );

  const suppressAutoshowAfterPreload = useRef(false);
  const pendingAfterForegroundNotLoaded = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  /** Dedupes concurrent inits; matches `AdMobBootstrap` but guarantees `load()` runs after SDK is ready. */
  const initOnceRef = useRef<Promise<void> | null>(null);
  const ensureMobileAdsInitialized = useCallback(() => {
    if (!initOnceRef.current) {
      initOnceRef.current = mobileAds()
        .initialize()
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
      const raw = await AsyncStorage.getItem(APP_OPEN_LAST_SHOWN_KEY);
      if (raw == null) return false;
      const last = Number.parseInt(raw, 10);
      if (Number.isNaN(last)) return false;
      return Date.now() - last < MIN_APP_OPEN_INTERVAL_MS;
    } catch {
      return false;
    }
  }, []);

  const markShown = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        APP_OPEN_LAST_SHOWN_KEY,
        String(Date.now()),
      );
    } catch {
      // ignore
    }
  }, []);

  const tryShow = useCallback(async () => {
    if (!isLoaded || isShowing) return;
    if (await shouldThrottleShow()) return;
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => resolve());
    });
    if (!isLoaded) return;
    markShown();
    show();
  }, [isLoaded, isShowing, shouldThrottleShow, markShown, show]);

  // Latest tryShow for AppState + LOADED (avoid effect deps on tryShow — it changes with isShowing).
  const tryShowRef = useRef(tryShow);
  const loadRef = useRef(load);
  const isLoadedRef = useRef(isLoaded);
  const canRequestRef = useRef(canRequest);
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
    if (!canRequest) {
      pendingAfterForegroundNotLoaded.current = false;
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
      if (isLoadedRef.current) {
        void tryShowRef.current();
      } else {
        pendingAfterForegroundNotLoaded.current = true;
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

  // A failed request should not leave "suppress" or pending-foreground intent stuck.
  useEffect(() => {
    if (error) {
      if (__DEV__) {
        console.warn("[AppOpenAd] ad error", error);
      }
      suppressAutoshowAfterPreload.current = false;
      pendingAfterForegroundNotLoaded.current = false;
    }
  }, [error]);

  // When an ad becomes loaded: preloads after a dismiss are suppressed; otherwise show (first open or resuming a load that started in the background).
  useEffect(() => {
    if (!isLoaded || !canRequest) return;
    if (suppressAutoshowAfterPreload.current) {
      suppressAutoshowAfterPreload.current = false;
      return;
    }
    if (pendingAfterForegroundNotLoaded.current) {
      pendingAfterForegroundNotLoaded.current = false;
    }
    void tryShowRef.current();
  }, [isLoaded, canRequest]);
  return null;
}
