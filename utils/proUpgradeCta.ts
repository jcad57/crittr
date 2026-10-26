/**
 * Trial-aware Crittr Pro CTA copy. Eligibility is decided by the store;
 * this only formats the label. Never mention a trial unless the store has
 * confirmed this user can still start one.
 */

export type ProCtaTrial = {
  durationLabel: string;
} | null;

export function proUpgradeCtaLabel(input: {
  resolved: boolean;
  trial: ProCtaTrial;
}): string {
  if (input.resolved && input.trial?.durationLabel) {
    return `Start ${input.trial.durationLabel} free trial`;
  }
  return "Continue to Crittr Pro";
}

/** Paywall disclaimer under the CTA. Omits trial language when ineligible. */
export function proPaywallDisclaimer(trial: ProCtaTrial): string {
  if (trial?.durationLabel) {
    return `No charge until your ${trial.durationLabel} trial ends · Cancel anytime`;
  }
  return "Cancel anytime";
}

/** Checkout resume line after the user dismissed the store sheet. */
export function proCheckoutPriceSubline(input: {
  formatted: string;
  cadence: string;
  trial: ProCtaTrial;
}): string {
  if (input.trial?.durationLabel) {
    return `${input.formatted}/${input.cadence} after your ${input.trial.durationLabel} free trial`;
  }
  return `${input.formatted}/${input.cadence} · Cancel anytime`;
}
