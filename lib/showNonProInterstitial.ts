import { AdUnitIds, INTERSTITIAL_ADS_ENABLED, type InterstitialPlacement } from "@/config/ads";
import { ensureMobileAdsInitialized } from "@/lib/ads/initialize";
import { setFullScreenAdActive, markFullScreenAdShownNow } from "@/lib/ads/fullScreenAdState";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";

const LOAD_TIMEOUT_MS = 12_000;
type LoadedInterstitial = { ad: InterstitialAd; unsubs: (() => void)[] };
type Slot = {
  cached: LoadedInterstitial | null;
  loading: Promise<LoadedInterstitial | null> | null;
  generation: number;
};
const slots = new Map<InterstitialPlacement, Slot>();
let presenting = false;

function slotFor(placement: InterstitialPlacement): Slot {
  let slot = slots.get(placement);
  if (!slot) {
    slot = { cached: null, loading: null, generation: 0 };
    slots.set(placement, slot);
  }
  return slot;
}

function dispose(loaded: LoadedInterstitial | null): void {
  if (!loaded) return;
  for (const unsub of loaded.unsubs.splice(0)) unsub();
  loaded.ad.destroy();
}

function loadInterstitial(placement: InterstitialPlacement, personalizedAds: boolean): Promise<LoadedInterstitial | null> {
  return new Promise((resolve) => {
    let loaded: LoadedInterstitial | null = null;
    let settled = false;
    const settle = (success: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!success) dispose(loaded);
      resolve(success ? loaded : null);
    };
    const timer = setTimeout(() => settle(false), LOAD_TIMEOUT_MS);
    try {
      const ad = InterstitialAd.createForAdRequest(AdUnitIds.interstitial[placement], {
        requestNonPersonalizedAdsOnly: !personalizedAds,
      });
      loaded = { ad, unsubs: [] };
      loaded.unsubs.push(ad.addAdEventListener(AdEventType.LOADED, () => settle(true)));
      loaded.unsubs.push(ad.addAdEventListener(AdEventType.ERROR, () => settle(false)));
      ad.load();
    } catch {
      settle(false);
    }
  });
}

function prepare(placement: InterstitialPlacement, isEligible: () => boolean): Promise<LoadedInterstitial | null> {
  const slot = slotFor(placement);
  if (slot.cached?.ad.loaded) return Promise.resolve(slot.cached);
  dispose(slot.cached);
  slot.cached = null;
  if (slot.loading) return slot.loading;
  const generation = slot.generation;
  const task = (async () => {
    try {
      if (!isEligible()) return null;
      const consent = await ensureMobileAdsInitialized();
      if (!consent.canRequestAds || !isEligible() || generation !== slot.generation) return null;
      const loaded = await loadInterstitial(placement, consent.personalizedAds);
      if (!isEligible() || generation !== slot.generation) {
        dispose(loaded);
        return null;
      }
      slot.cached = loaded;
      return loaded;
    } catch {
      return null;
    }
  })();
  slot.loading = task;
  void task.finally(() => {
    if (slot.loading === task) slot.loading = null;
  });
  return task;
}

/** Each flow owns a separate unit/cache. Never preload for an ineligible user. */
export function preloadNonProInterstitial(placement: InterstitialPlacement, isEligible: () => boolean): void {
  if (!INTERSTITIAL_ADS_ENABLED || !isEligible() || presenting) return;
  void prepare(placement, isEligible);
}

export function discardPreloadedInterstitial(placement: InterstitialPlacement): void {
  const slot = slotFor(placement);
  slot.generation += 1;
  dispose(slot.cached);
  slot.cached = null;
  slot.loading = null;
}

/** Saves must succeed first. Completion waits for dismissal, or continues on failure/no fill. */
export async function showNonProInterstitialThen(
  placement: InterstitialPlacement,
  isEligible: () => boolean,
  onComplete: () => void,
): Promise<void> {
  if (!INTERSTITIAL_ADS_ENABLED || !isEligible() || presenting) {
    onComplete();
    return;
  }
  // Claim synchronously, including load time, so separate flows cannot overlap.
  presenting = true;
  setFullScreenAdActive(true);
  let loaded: LoadedInterstitial | null = null;
  let showRequested = false;
  try {
    const slot = slotFor(placement);
    loaded = await prepare(placement, isEligible);
    if (slot.cached === loaded) slot.cached = null;
    if (!loaded || !isEligible()) return;
    const current = loaded;
    await new Promise<void>((resolve) => {
      current.unsubs.push(current.ad.addAdEventListener(AdEventType.CLOSED, () => resolve()));
      current.unsubs.push(current.ad.addAdEventListener(AdEventType.ERROR, () => resolve()));
      try {
        showRequested = true;
        void markFullScreenAdShownNow();
        current.ad.show().catch(() => resolve());
      } catch {
        resolve();
      }
    });
  } finally {
    dispose(loaded);
    if (showRequested) void markFullScreenAdShownNow();
    presenting = false;
    setFullScreenAdActive(false);
    onComplete();
  }
}
