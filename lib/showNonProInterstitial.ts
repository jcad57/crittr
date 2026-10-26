import { AdUnitIds, INTERSTITIAL_ADS_ENABLED } from "@/config/ads";
import { ensureTrackingConsent } from "@/lib/ads/trackingConsent";
import mobileAds, {
  AdEventType,
  InterstitialAd,
} from "react-native-google-mobile-ads";

const LOAD_TIMEOUT_MS = 12_000;

type LoadedInterstitial = {
  ad: InterstitialAd;
  unsubs: (() => void)[];
};

/** Preloaded unit owned by the add-activity screen until show / discard. */
let cached: LoadedInterstitial | null = null;
let loadInFlight: Promise<LoadedInterstitial | null> | null = null;
/** Bumped on discard so in-flight loads do not re-publish after leave. */
let preloadGeneration = 0;
/** True while an interstitial is on screen — discard must not tear it down. */
let showing = false;

function detachListeners(unsubs: (() => void)[]) {
  for (const u of unsubs) {
    try {
      u();
    } catch {
      // ignore
    }
  }
  unsubs.length = 0;
}

function clearCached() {
  if (!cached) return;
  detachListeners(cached.unsubs);
  cached = null;
}

async function ensureSdkReady(): Promise<{ personalizedAds: boolean } | null> {
  try {
    const consent = await ensureTrackingConsent();
    if (!consent.canRequestAds) return null;
    await mobileAds().initialize();
    return { personalizedAds: consent.personalizedAds };
  } catch {
    return null;
  }
}

function loadInterstitial(
  personalizedAds: boolean,
): Promise<LoadedInterstitial | null> {
  return new Promise((resolve) => {
    const interstitial = InterstitialAd.createForAdRequest(
      AdUnitIds.interstitial,
      { requestNonPersonalizedAdsOnly: !personalizedAds },
    );
    const unsubs: (() => void)[] = [];
    let settled = false;

    const settle = (value: LoadedInterstitial | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (!value) {
        detachListeners(unsubs);
      }
      resolve(value);
    };

    unsubs.push(
      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        settle({ ad: interstitial, unsubs });
      }),
    );
    unsubs.push(
      interstitial.addAdEventListener(AdEventType.ERROR, () => {
        settle(null);
      }),
    );

    const timeoutId = setTimeout(() => {
      if (__DEV__) {
        console.warn(
          "[Interstitial] no fill before timeout, continuing navigation",
        );
      }
      settle(null);
    }, LOAD_TIMEOUT_MS);

    interstitial.load();
  });
}

/**
 * Warm a full-screen interstitial while the user is on the activity details step
 * so it can show immediately after a successful save (non–Crittr Pro only).
 */
export function preloadNonProInterstitial(): void {
  if (!INTERSTITIAL_ADS_ENABLED) return;
  if (cached || loadInFlight || showing) return;

  const gen = preloadGeneration;
  loadInFlight = (async () => {
    const ready = await ensureSdkReady();
    if (!ready || gen !== preloadGeneration) return null;
    const loaded = await loadInterstitial(ready.personalizedAds);
    if (!loaded || gen !== preloadGeneration) {
      if (loaded) detachListeners(loaded.unsubs);
      return null;
    }
    cached = loaded;
    return loaded;
  })().finally(() => {
    loadInFlight = null;
  });
}

/** Drop a preloaded interstitial that was never shown (e.g. user left the form). */
export function discardPreloadedInterstitial(): void {
  if (showing) return;
  preloadGeneration += 1;
  clearCached();
}

/**
 * Shows a full-screen interstitial when inventory is available, then runs `onComplete`
 * (shown, failed, timed out, or closed). Caller should only invoke for non–Crittr Pro
 * users **after** the activity save has already succeeded — closing the app during the
 * ad must not affect persistence.
 */
export function showNonProInterstitialThen(
  onComplete: () => void,
): Promise<void> {
  if (!INTERSTITIAL_ADS_ENABLED) {
    onComplete();
    return Promise.resolve();
  }

  return (async () => {
    let loaded: LoadedInterstitial | null = cached;
    cached = null;

    if (!loaded && loadInFlight) {
      loaded = await loadInFlight;
      // Preload publishes the same instance to `cached` when it settles.
      if (!loaded) {
        loaded = cached;
      }
      cached = null;
    }

    if (!loaded) {
      const ready = await ensureSdkReady();
      if (!ready) {
        onComplete();
        return;
      }
      loaded = await loadInterstitial(ready.personalizedAds);
    }

    if (!loaded) {
      onComplete();
      return;
    }

    showing = true;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      showing = false;
      detachListeners(loaded!.unsubs);
      onComplete();
    };

    loaded.unsubs.push(
      loaded.ad.addAdEventListener(AdEventType.CLOSED, () => {
        finish();
      }),
    );
    loaded.unsubs.push(
      loaded.ad.addAdEventListener(AdEventType.ERROR, () => {
        finish();
      }),
    );

    try {
      await loaded.ad.show();
    } catch {
      finish();
    }
  })();
}
