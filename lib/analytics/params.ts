/**
 * Firebase Analytics event/param sanitizers.
 *
 * Invalid names or types are dropped silently by Google's backend, so we
 * normalize on the client. Never send emails, names, or other PII.
 */

/** Events Firebase logs itself — sending them via logEvent throws. */
export const FIREBASE_RESERVED_EVENTS = new Set([
  "ad_activeview",
  "ad_click",
  "ad_exposure",
  "ad_impression",
  "ad_query",
  "ad_reward",
  "adunit_exposure",
  "app_background",
  "app_clear_data",
  "app_remove",
  "app_store_refund",
  "app_store_subscription_cancel",
  "app_store_subscription_convert",
  "app_store_subscription_renew",
  "app_update",
  "app_upgrade",
  "error",
  "first_open",
  "first_visit",
  "in_app_purchase",
  "notification_dismiss",
  "notification_foreground",
  "notification_open",
  "notification_receive",
  "os_update",
  "session_start",
  "session_start_with_rollout",
  "user_engagement",
]);

export type AnalyticsParamValue = string | number | boolean;
export type AnalyticsParams = Record<string, AnalyticsParamValue | null | undefined>;
export type SanitizedAnalyticsParams = Record<string, AnalyticsParamValue>;

const EVENT_NAME_MAX = 40;
const PARAM_NAME_MAX = 40;
const PARAM_VALUE_MAX = 100;

/** Firebase event names: letter first, then letters/digits/underscore, ≤40 chars. */
export function sanitizeEventName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (FIREBASE_RESERVED_EVENTS.has(trimmed)) return null;
  const normalized = trimmed.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, EVENT_NAME_MAX);
  if (!/^[a-zA-Z]/.test(normalized)) return null;
  if (
    normalized.startsWith("firebase_") ||
    normalized.startsWith("google_") ||
    normalized.startsWith("ga_")
  ) {
    return null;
  }
  return normalized;
}

function sanitizeParamName(name: string): string | null {
  const normalized = name.trim().replace(/[^a-zA-Z0-9_]/g, "_").slice(0, PARAM_NAME_MAX);
  if (!normalized || !/^[a-zA-Z]/.test(normalized)) return null;
  return normalized;
}

function sanitizeParamValue(value: unknown): AnalyticsParamValue | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, PARAM_VALUE_MAX);
  }
  return null;
}

export function sanitizeEventParams(
  params?: AnalyticsParams,
): SanitizedAnalyticsParams | undefined {
  if (!params) return undefined;
  const out: SanitizedAnalyticsParams = {};
  for (const [rawKey, rawValue] of Object.entries(params)) {
    if (rawValue == null) continue;
    const key = sanitizeParamName(rawKey);
    const value = sanitizeParamValue(rawValue);
    if (!key || value == null) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function petCountBucket(count: number): "0" | "1" | "2_plus" {
  if (count <= 0) return "0";
  if (count === 1) return "1";
  return "2_plus";
}

export function screenNameFromPath(pathname: string): string {
  const cleaned = pathname.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
  return (cleaned || "index").slice(0, PARAM_VALUE_MAX);
}
