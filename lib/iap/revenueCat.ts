import { sessionGeneration } from "@/lib/sessionGeneration";
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
} from "react-native-purchases";

const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? "";
const RC_API_KEY_ANDROID =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? "";

let configured = false;
let configurePromise: Promise<void> | null = null;

function platformApiKey(): string {
  return Platform.OS === "ios" ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
}

/**
 * One-shot configure for `react-native-purchases`. Safe to call from any
 * component or store; subsequent calls are no-ops. We pass the Supabase
 * `userId` as `appUserID` when known so RevenueCat ties purchases to the same
 * id as the rest of the app — this matches what the webhook handler expects.
 */
export function configureRevenueCat(appUserId?: string | null): Promise<void> {
  if (configurePromise) return configurePromise;
  if (configured) return Promise.resolve();

  const apiKey = platformApiKey();
  if (!apiKey) {
    if (__DEV__) {
      console.warn(
        "[RevenueCat] no public API key for",
        Platform.OS,
        "- skipping configure",
      );
    } else {
      console.error(
        "[RevenueCat] Missing EXPO_PUBLIC_REVENUECAT_API_KEY for this platform — IAP will not work. Add it to EAS environment variables for production/TestFlight builds (baked in at compile time).",
      );
    }
    return Promise.resolve();
  }

  configurePromise = (async () => {
    try {
      if (__DEV__) {
        await Purchases.setLogLevel(LOG_LEVEL.WARN);
      }
      Purchases.configure({
        apiKey,
        appUserID: appUserId && appUserId.length > 0 ? appUserId : null,
      });
      configured = true;
    } catch (e) {
      if (__DEV__) console.warn("[RevenueCat] configure failed", e);
    }
  })().finally(() => {
    configurePromise = null;
  });

  return configurePromise;
}

export function isRevenueCatConfigured(): boolean {
  return configured;
}

let identityQueue: Promise<unknown> = Promise.resolve();
let desiredUserId: string | null = null;
let identityRevision = 0;
function serialized<T>(action: () => Promise<T>): Promise<T> {
  const task = identityQueue.then(action, action);
  identityQueue = task.catch(() => {});
  return task;
}
/** Login, purchases, restores, and logout share one native identity queue. */
export function withRevenueCatUser<T>(
  userId: string,
  action: () => Promise<T>,
): Promise<T> {
  desiredUserId = userId;
  const revision = identityRevision,
    generation = sessionGeneration();
  return serialized(async () => {
    if (
      generation !== sessionGeneration() ||
      revision !== identityRevision ||
      desiredUserId !== userId
    )
      throw new Error("Billing account changed");
    await configureRevenueCat(userId);
    if (!configured)
      throw new Error("Subscriptions are unavailable in this build");
    if ((await Purchases.getAppUserID()) !== userId)
      await Purchases.logIn(userId);
    if (
      generation !== sessionGeneration() ||
      revision !== identityRevision ||
      desiredUserId !== userId ||
      (await Purchases.getAppUserID()) !== userId
    )
      throw new Error("Billing account changed");
    const result = await action();
    if (
      generation !== sessionGeneration() ||
      revision !== identityRevision ||
      desiredUserId !== userId
    )
      throw new Error("Billing account changed");
    return result;
  });
}
export function loginRevenueCatUser(
  userId: string,
): Promise<CustomerInfo | null> {
  return withRevenueCatUser(userId, () => Purchases.getCustomerInfo()).catch(
    () => null,
  );
}
export function logoutRevenueCatUser(): Promise<void> {
  identityRevision++;
  desiredUserId = null;
  return serialized(async () => {
    if (!configured) return;
    try {
      if (!(await Purchases.isAnonymous())) await Purchases.logOut();
    } catch {
      /* Backend authorization never relies on this device identity. */
    }
  });
}
export async function getRevenueCatCustomerInfo(
  userId?: string,
): Promise<CustomerInfo | null> {
  const id = userId ?? desiredUserId;
  if (!id) return null;
  return loginRevenueCatUser(id);
}
export function getIdentifiedRevenueCatCustomerInfo(
  userId: string,
): Promise<CustomerInfo | null> {
  return withRevenueCatUser(userId, async () => {
    await Purchases.invalidateCustomerInfoCache();
    return Purchases.getCustomerInfo();
  }).catch(() => null);
}
export async function canMakeStorePayments(): Promise<boolean> {
  if (!configured) return true;
  try {
    return await Purchases.canMakePayments();
  } catch {
    return true;
  }
}
