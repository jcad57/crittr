import * as Application from "expo-application";
import { Platform } from "react-native";
import { withTimeout } from "@/lib/iap/withTimeout";

export type PurchaseEnvironment = "production" | "sandbox" | "xcode" | "simulator" | "unknown";

/** AppTransaction describes this installation, unlike an old subscription receipt. Display only. */
export async function getPurchaseEnvironment(): Promise<PurchaseEnvironment> {
  if (Platform.OS !== "ios") return "unknown";
  const [environment, release] = await Promise.all([
    withTimeout(Application.getAppleStoreEnvironmentAsync().catch(() => null), 3_000),
    withTimeout(Application.getIosApplicationReleaseTypeAsync().catch(() => Application.ApplicationReleaseType.UNKNOWN), 3_000),
  ]);
  if (environment === "production" || environment === "sandbox" || environment === "xcode") return environment;
  if (release === Application.ApplicationReleaseType.SIMULATOR) return "simulator";
  if (release !== undefined && [Application.ApplicationReleaseType.DEVELOPMENT, Application.ApplicationReleaseType.AD_HOC, Application.ApplicationReleaseType.ENTERPRISE].includes(release)) return "sandbox";
  return "unknown";
}

export function purchaseEnvironmentCopy(environment: PurchaseEnvironment): { title: string; message: string } {
  if (environment === "production") return {
    title: "App Store · Live purchases",
    message: "You’re using the App Store version. Subscriptions use real payments through your Apple Account.",
  };
  if (environment === "unknown") return {
    title: "Purchase environment unavailable",
    message: "We couldn’t confirm whether this is a test build. Apple’s confirmation sheet will show whether the purchase is a test or a real payment.",
  };
  return {
    title: environment === "simulator" || environment === "xcode" ? "Simulator · Test purchases" : "Testing environment · No charge",
    message: "It looks like you’re using a testing environment. TestFlight and simulator purchases won’t charge you. To make a real purchase, install Crittr from the App Store.",
  };
}
