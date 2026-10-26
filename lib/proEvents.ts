import { logAnalyticsEvent } from "@/lib/analytics/firebase";

/**
 * Pro UX event points. Forwards to Firebase Analytics; still logs in
 * development so instrumentation stays visible without a native build.
 */

export type ProEventName =
  | "pro_progress_celebration_shown"
  | "pro_progress_celebration_dismissed"
  | "pro_progress_celebration_cta_tapped"
  | "pro_soft_paywall_shown"
  | "pro_soft_paywall_cta_tapped"
  | "pro_onboarding_started"
  | "pro_onboarding_step_completed"
  | "pro_onboarding_skipped"
  | "pro_onboarding_completed";

export function trackProEvent(
  name: ProEventName,
  props?: Record<string, string | number | boolean | null>,
): void {
  logAnalyticsEvent(name, props);
  if (__DEV__) {
    console.log("[pro]", name, props ?? "");
  }
}
