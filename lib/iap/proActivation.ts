export type ProActivationSource = "purchase" | "restore" | "paywall";

/**
 * Hard ceiling for any "Activating Crittr Pro…" UI. Past this the screen
 * must recover (navigate if the SDK already unlocked Pro, otherwise error).
 *
 * Apple / Google already charged the user. Waiting on a backend mirror is
 * not part of a successful checkout.
 */
export const PRO_ACTIVATION_UI_WATCHDOG_MS = 12_000;

/** Bounded wait when RevenueCat has not yet confirmed the entitlement. */
export const PRO_ACTIVATION_FALLBACK_WAIT_MS = 12_000;

/** Paywall preflight: SDK already reported Pro; only a short mirror attempt. */
export const PRO_ACTIVATION_PAYWALL_WAIT_MS = 8_000;

/**
 * How long the UI may block after a store success.
 *
 * If RevenueCat CustomerInfo already has Crittr Pro, the answer is zero —
 * client access is unlocked and the Supabase `profiles` mirror is a
 * background write for CrittrAI / co-care, not a gate.
 */
export function resolveProActivationWaitMs(opts: {
  source: ProActivationSource;
  revenueCatAlreadyHasPro: boolean;
}): number {
  if (opts.revenueCatAlreadyHasPro) return 0;
  if (opts.source === "paywall") return PRO_ACTIVATION_PAYWALL_WAIT_MS;
  return PRO_ACTIVATION_FALLBACK_WAIT_MS;
}

export const PURCHASE_SUCCEEDED_SYNC_ERROR =
  "Your purchase went through, but confirming Crittr Pro is taking longer than expected. You won't be charged again — retry activation, or go to the dashboard and Pro will unlock as soon as it syncs.";
