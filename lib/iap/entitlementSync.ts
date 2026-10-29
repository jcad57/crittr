import {
  loginRevenueCatUser,
  isRevenueCatConfigured,
} from "@/lib/iap/revenueCat";
import { withTimeout } from "@/lib/iap/withTimeout";
import { sessionGeneration } from "@/lib/sessionGeneration";
import { supabase } from "@/lib/supabase";
import Purchases from "react-native-purchases";
export type CrittrProEntitlementSyncResult = "synced" | "skipped" | "failed" | "sandbox_restricted";
export type CrittrProSyncSource =
  | "checkout"
  | "restore"
  | "session"
  | "app_launch"
  | "focus"
  | "cust_info"
  | "paywall";
const flights = new Map<string, Promise<CrittrProEntitlementSyncResult>>();
async function sync(
  source: CrittrProSyncSource,
  expectedUserId?: string,
): Promise<CrittrProEntitlementSyncResult> {
  const generation = sessionGeneration();
  let auth;
  try { auth = await withTimeout(supabase.auth.getSession(), 5_000); }
  catch { return "failed"; }
  if (!auth) return "failed";
  const { data: { session } } = auth;
  if (
    generation !== sessionGeneration() ||
    !session ||
    (expectedUserId && session.user.id !== expectedUserId)
  )
    return "skipped";
  const userId = session.user.id,
    key = `${generation}:${userId}`;
  if (flights.has(key)) return flights.get(key)!;
  const task = (async (): Promise<CrittrProEntitlementSyncResult> => {
    // The server verifies this UUID independently; a stalled native store must
    // not delay a dashboard grant or access on another platform.
    void withTimeout(loginRevenueCatUser(userId), 5000).catch(() => {});
    if (generation !== sessionGeneration()) return "skipped";
    const budget = source === "checkout" || source === "restore" ? 45000 : 15000;
    const controller = new AbortController(),
      timer = setTimeout(
        () => controller.abort(),
        budget,
      );
    try {
      const response = await withTimeout(supabase.functions.invoke(
        "sync-crittr-pro-entitlement",
        { body: { source }, signal: controller.signal },
      ), budget);
      if (!response) { controller.abort(); return "failed"; }
      if (response.error) throw response.error;
      if (generation !== sessionGeneration()) return "skipped";
      if (response.data?.verification === "sandbox_restricted") return "sandbox_restricted";
      return generation === sessionGeneration() ? "synced" : "skipped";
    } finally {
      clearTimeout(timer);
    }
  })().catch((): CrittrProEntitlementSyncResult => "failed");
  flights.set(key, task);
  try {
    return await task;
  } catch {
    return "failed";
  } finally {
    if (flights.get(key) === task) flights.delete(key);
  }
}
export const syncCrittrProForSession = (id: string) => sync("session", id);
export const syncCrittrProOnAppLaunch = (id: string) => sync("app_launch", id);
export const syncCrittrProAfterRestore = (id: string) => sync("restore", id);
export const syncCrittrProFromCustomerInfo = (id: string) =>
  sync("cust_info", id);
// Identity hints remain accepted for old call sites but are never sent as authority.
export const syncCrittrProAfterCheckout = (
  _id?: string | null,
  _alternates?: string[],
) => sync("checkout");
export const syncCrittrProForPaywall = (
  _id?: string | null,
  _alternates?: string[],
) => sync("paywall");
export async function getRevenueCatAppUserIdForSync(): Promise<string | null> {
  return isRevenueCatConfigured() ? Purchases.getAppUserID() : null;
}
