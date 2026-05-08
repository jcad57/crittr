import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { AdsConsent, AdsConsentStatus } from "react-native-google-mobile-ads";

/**
 * Result of the consent + ATT flow.
 *
 * `canRequestAds` is true when AdMob may request ads at all (driven by UMP).
 * `personalizedAds` is true only when ATT was authorized AND UMP did not
 * restrict to non-personalized ads.
 */
export type TrackingConsentResult = {
  canRequestAds: boolean;
  personalizedAds: boolean;
  attStatus: PermissionStatus | "not-applicable";
};

/**
 * iOS requires the app to be foregrounded (`UIApplicationStateActive`) before
 * the ATT prompt can appear. Splash screens, Stage Manager hand-off, and the
 * iPad multi-window launch path can all leave the app momentarily inactive,
 * which is exactly the state where the ATT prompt silently fails to show
 * (the iPadOS 26.4 reproduction Apple flagged in App Review).
 */
async function waitForActiveAppState(timeoutMs = 4000): Promise<void> {
  if (AppState.currentState === "active") return;
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      sub.remove();
      clearTimeout(timer);
      resolve();
    };
    const sub = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        if (next === "active") finish();
      },
    );
    const timer = setTimeout(finish, timeoutMs);
  });
}

let cached: Promise<TrackingConsentResult> | null = null;

async function runConsentAndAtt(): Promise<TrackingConsentResult> {
  await waitForActiveAppState();

  let canRequestAds = true;
  try {
    const info = await AdsConsent.requestInfoUpdate();
    canRequestAds = info.canRequestAds ?? true;
    if (info.isConsentFormAvailable) {
      const after = await AdsConsent.loadAndShowConsentFormIfRequired();
      canRequestAds = after.canRequestAds ?? canRequestAds;
    }
  } catch (e) {
    if (__DEV__) console.warn("[trackingConsent] UMP", e);
  }

  if (Platform.OS !== "ios") {
    return {
      canRequestAds,
      personalizedAds: canRequestAds,
      attStatus: "not-applicable",
    };
  }

  let attStatus: PermissionStatus = PermissionStatus.UNDETERMINED;
  try {
    const existing = await getTrackingPermissionsAsync();
    attStatus = existing.status;
    if (existing.status === PermissionStatus.UNDETERMINED) {
      const requested = await requestTrackingPermissionsAsync();
      attStatus = requested.status;
    }
  } catch (e) {
    if (__DEV__) console.warn("[trackingConsent] ATT", e);
  }

  let umpAllowsPersonalized = canRequestAds;
  try {
    const status = await AdsConsent.getConsentInfo();
    if (status?.status != null) {
      umpAllowsPersonalized = status.status === AdsConsentStatus.OBTAINED;
    }
  } catch {
    /* AdsConsent may not have a final status — fall through to ATT-driven default. */
  }

  return {
    canRequestAds,
    personalizedAds:
      attStatus === PermissionStatus.GRANTED && umpAllowsPersonalized,
    attStatus,
  };
}

/**
 * Idempotent gate: runs UMP consent first, then ATT, then returns whether ads
 * may be requested and personalized. Subsequent calls return the cached result
 * so screens can re-check without re-prompting.
 */
export function ensureTrackingConsent(): Promise<TrackingConsentResult> {
  if (!cached) {
    cached = runConsentAndAtt();
  }
  return cached;
}

/**
 * Synchronous best-effort read of the cached result. Returns
 * `{ canRequestAds: true, personalizedAds: false }` until the gate completes —
 * a safe default that never serves IDFA-personalized ads pre-consent.
 */
export function getCachedTrackingConsent(): TrackingConsentResult {
  return {
    canRequestAds: true,
    personalizedAds: false,
    attStatus: PermissionStatus.UNDETERMINED,
  };
}
