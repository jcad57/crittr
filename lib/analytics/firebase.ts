/**
 * Native Firebase Analytics access. Every entry point is a no-op on web, in
 * Expo Go, and when the native module is missing — callers must never throw
 * or block UI because analytics failed.
 */

import Constants from "expo-constants";
import { Platform } from "react-native";
import type { FirebaseConsentSettings } from "./consent";
import {
  sanitizeEventName,
  sanitizeEventParams,
  type AnalyticsParams,
} from "./params";

type AnalyticsMod = typeof import("@react-native-firebase/analytics");
type AnalyticsInstance = ReturnType<AnalyticsMod["getAnalytics"]>;

let modulePromise: Promise<AnalyticsMod | null> | null = null;

function canUseNativeFirebase(): boolean {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  if (Constants.appOwnership === "expo") return false;
  if (Constants.executionEnvironment === "storeClient") return false;
  return true;
}

async function loadAnalyticsModule(): Promise<AnalyticsMod | null> {
  if (!canUseNativeFirebase()) return null;
  if (!modulePromise) {
    modulePromise = (async () => {
      try {
        await import("@react-native-firebase/app");
        return await import("@react-native-firebase/analytics");
      } catch (e) {
        if (__DEV__) console.warn("[analytics] native module unavailable", e);
        return null;
      }
    })();
  }
  return modulePromise;
}

async function withAnalytics(
  run: (mod: AnalyticsMod, analytics: AnalyticsInstance) => Promise<void> | void,
): Promise<void> {
  try {
    const mod = await loadAnalyticsModule();
    if (!mod) return;
    const analytics = mod.getAnalytics();
    await run(mod, analytics);
  } catch (e) {
    if (__DEV__) console.warn("[analytics]", e);
  }
}

export function logAnalyticsEvent(
  name: string,
  params?: AnalyticsParams,
): void {
  const eventName = sanitizeEventName(name);
  if (!eventName) return;
  const sanitized = sanitizeEventParams(params);
  void withAnalytics((mod, analytics) => {
    mod.logEvent(analytics, eventName, sanitized);
  });
}

export function logScreenView(screenName: string, screenClass = "ExpoRouter"): void {
  void withAnalytics((mod, analytics) =>
    mod.logScreenView(analytics, {
      screen_name: screenName.slice(0, 100),
      screen_class: screenClass.slice(0, 100),
    }),
  );
}

export function logSignUp(method: string): void {
  void withAnalytics((mod, analytics) =>
    mod.logSignUp(analytics, { method }),
  );
}

export function logLogin(method: string): void {
  void withAnalytics((mod, analytics) =>
    mod.logLogin(analytics, { method }),
  );
}

export function logTutorialBegin(): void {
  void withAnalytics((mod, analytics) => mod.logTutorialBegin(analytics));
}

export function logTutorialComplete(): void {
  void withAnalytics((mod, analytics) => mod.logTutorialComplete(analytics));
}

export function logBeginCheckout(params: {
  value: number;
  currency: string;
  itemId: string;
  itemName: string;
  itemCategory?: string;
}): void {
  void withAnalytics((mod, analytics) =>
    mod.logBeginCheckout(analytics, {
      value: params.value,
      currency: params.currency,
      items: [
        {
          item_id: params.itemId,
          item_name: params.itemName,
          item_category: params.itemCategory,
          price: params.value,
          quantity: 1,
        },
      ],
    }),
  );
}

export function logPurchase(params: {
  value: number;
  currency: string;
  itemId: string;
  itemName: string;
  itemCategory?: string;
  transactionId?: string;
}): void {
  void withAnalytics((mod, analytics) =>
    mod.logPurchase(analytics, {
      value: params.value,
      currency: params.currency,
      transaction_id: params.transactionId,
      items: [
        {
          item_id: params.itemId,
          item_name: params.itemName,
          item_category: params.itemCategory,
          price: params.value,
          quantity: 1,
        },
      ],
    }),
  );
}

export function logViewItem(params: {
  itemId: string;
  itemName: string;
  itemCategory?: string;
}): void {
  void withAnalytics((mod, analytics) =>
    mod.logViewItem(analytics, {
      items: [
        {
          item_id: params.itemId,
          item_name: params.itemName,
          item_category: params.itemCategory,
        },
      ],
    }),
  );
}

export function setAnalyticsConsent(consent: FirebaseConsentSettings): void {
  void withAnalytics((mod, analytics) => mod.setConsent(analytics, consent));
}

export function setAnalyticsCollectionEnabled(enabled: boolean): void {
  void withAnalytics((mod, analytics) =>
    mod.setAnalyticsCollectionEnabled(analytics, enabled),
  );
}

export function setAnalyticsUserId(userId: string | null): void {
  void withAnalytics((mod, analytics) => mod.setUserId(analytics, userId));
}

export function setAnalyticsUserProperties(
  properties: Record<string, string | null>,
): void {
  void withAnalytics((mod, analytics) =>
    mod.setUserProperties(analytics, properties),
  );
}
