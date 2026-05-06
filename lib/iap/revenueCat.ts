import { Platform } from "react-native";
import Purchases, { type CustomerInfo, LOG_LEVEL } from "react-native-purchases";

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
    } finally {
      configurePromise = null;
    }
  })();

  return configurePromise;
}

export function isRevenueCatConfigured(): boolean {
  return configured;
}

/**
 * Aliases the current RevenueCat user with `userId` (Supabase auth user id) so
 * purchases on this device are linked to that account. Idempotent — RC handles
 * re-login safely. Returns the latest CustomerInfo so callers can sync.
 */
export async function loginRevenueCatUser(
  userId: string,
): Promise<CustomerInfo | null> {
  if (!platformApiKey()) return null;
  await configureRevenueCat(userId);
  if (!configured) return null;
  try {
    const result = await Purchases.logIn(userId);
    return result.customerInfo;
  } catch (e) {
    if (__DEV__) console.warn("[RevenueCat] logIn failed", e);
    return null;
  }
}

/**
 * Resets RevenueCat to an anonymous user (used on app sign-out). RC will
 * generate a fresh anonymous id; future logins re-attach the Supabase id.
 */
export async function logoutRevenueCatUser(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    if (__DEV__) console.warn("[RevenueCat] logOut failed", e);
  }
}

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo | null> {
  if (!platformApiKey()) return null;
  await configureRevenueCat();
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    if (__DEV__) console.warn("[RevenueCat] getCustomerInfo failed", e);
    return null;
  }
}
