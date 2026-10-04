/**
 * Shared rules for whether Crittr may request or display ads.
 *
 * Ads are only for signed-in, non–Crittr Pro users who have finished
 * onboarding and are inside the logged-in shell — never during welcome,
 * sign-in, password reset, or other auth screens. A recovery session from
 * `verifyOtp` still sets `isLoggedIn`, so route checks are required.
 */

/** Paywall / purchase screens inside `(logged-in)` that must stay ad-free. */
export const AD_FREE_LOGGED_IN_PATH_SEGMENTS = [
  "upgrade",
  "pro-checkout",
  "welcome-to-pro",
] as const;

/** Auth and recovery screens — never request ads here even if a session exists. */
export const AD_FREE_AUTH_PATH_SEGMENTS = [
  "sign-in",
  "forgot-password",
  "reset-password",
  "onboarding",
  "terms-of-service",
  "auth/callback",
] as const;

export type AdsEligibilityInput = {
  isLoggedIn: boolean;
  isHydrating: boolean;
  needsOnboarding: boolean;
  isPro: boolean;
  profilePending: boolean;
  profilePlaceholder: boolean;
  isOnLoggedInRoute: boolean;
  pathname: string;
};

export function isAdsEligible(input: AdsEligibilityInput): boolean {
  if (!input.isLoggedIn) return false;
  if (input.isHydrating) return false;
  if (input.needsOnboarding) return false;
  if (input.isPro) return false;
  if (input.profilePending || input.profilePlaceholder) return false;
  if (!input.isOnLoggedInRoute) return false;

  const path = input.pathname;
  if (AD_FREE_LOGGED_IN_PATH_SEGMENTS.some((segment) => path.includes(segment))) {
    return false;
  }
  if (AD_FREE_AUTH_PATH_SEGMENTS.some((segment) => path.includes(segment))) {
    return false;
  }
  /** `/welcome` is auth; `welcome-to-pro` is already covered above. */
  if (path.includes("welcome") && !path.includes("welcome-to-pro")) {
    return false;
  }

  return true;
}
