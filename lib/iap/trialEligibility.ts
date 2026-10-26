/**
 * Trial eligibility and duration formatting. No React Native / RevenueCat
 * imports so this can be unit-tested in Node.
 *
 * A free trial is granted once per store account (Apple ID / Google account)
 * per subscription group — not once per Crittr login. Copy and checkout must
 * only mention a trial when the store has confirmed this account can start one.
 */

export type StoreTrialOffer = {
  durationLabel: string;
  iso8601: string | null;
};

/**
 * StoreKit intro-offer eligibility as we care about it for copy and checkout.
 * `unknown` is common in sandbox and on first launch — never advertise a trial
 * unless the store has confirmed this account can start one.
 */
export type IosIntroEligibilityKind =
  | "eligible"
  | "ineligible"
  | "no_intro_offer"
  | "unknown";

export type AndroidFreePhase = {
  unit: string;
  value: number;
  iso8601: string | null;
};

/** Renders a billing period the way a paywall should read it. */
export function formatTrialDuration(unit: string, value: number): string {
  const normalized = unit.toUpperCase();
  const count = Number.isFinite(value) && value > 0 ? Math.round(value) : 1;

  // Play stores a week-long trial as P1W; everyone writes that as "7-day".
  if (normalized === "WEEK") {
    return count === 1 ? "7-day" : `${count}-week`;
  }
  if (normalized === "DAY") return `${count}-day`;
  if (normalized === "MONTH") return `${count}-month`;
  if (normalized === "YEAR") return `${count}-year`;
  return `${count}-day`;
}

/**
 * The trial this user may still start, or `null` if we must not mention one.
 *
 * - iOS: StoreKit attaches intro offers to every product. Eligibility is a
 *   separate Apple-ID check. Only `eligible` may surface in the UI.
 * - Android: Play Billing only returns offers the signed-in Google account
 *   can use. A missing free phase means they would be charged today — never
 *   fall back to a catalog `introPrice`.
 */
export function resolveStoreTrialOffer(input: {
  platform: string;
  androidFreePhase: AndroidFreePhase | null;
  iosIntroTrial: StoreTrialOffer | null;
  iosEligibility: IosIntroEligibilityKind;
}): StoreTrialOffer | null {
  if (input.platform === "ios") {
    if (input.iosEligibility !== "eligible") return null;
    return input.iosIntroTrial;
  }
  const phase = input.androidFreePhase;
  if (!phase) return null;
  return {
    durationLabel: formatTrialDuration(phase.unit, phase.value),
    iso8601: phase.iso8601,
  };
}

export function iosEligibilityKindFromStatus(
  status: number | undefined,
  eligible: number,
  ineligible: number,
  noIntroOffer: number,
): IosIntroEligibilityKind {
  if (status === eligible) return "eligible";
  if (status === ineligible) return "ineligible";
  if (status === noIntroOffer) return "no_intro_offer";
  return "unknown";
}
