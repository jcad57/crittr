/**
 * Maps a Stripe Subscription to `profiles.crittr_pro_until`.
 * Shared by stripe-webhook, sync-crittr-pro-entitlement, and checkout.
 */

type SubscriptionLike = {
  status: string;
  trial_end: number | null;
  current_period_end: number | null;
  default_payment_method?: string | { id?: string } | null;
};

/** True when Stripe has attached a default payment method on the subscription. */
export function subscriptionHasDefaultPaymentMethod(
  sub: SubscriptionLike,
): boolean {
  const dm = sub.default_payment_method;
  if (dm == null) return false;
  if (typeof dm === "string") return dm.length > 0;
  return true;
}

/**
 * Only persist Crittr Pro dates once checkout is real: trialing users must
 * complete PaymentSheet so a default payment method exists. Otherwise
 * abandoned checkouts would grant Pro and block retries as "already subscribed".
 */
export function shouldGrantCrittrProFromSubscription(
  sub: SubscriptionLike,
): boolean {
  const st = sub.status;
  if (
    st === "incomplete" ||
    st === "incomplete_expired" ||
    st === "unpaid" ||
    st === "paused"
  ) {
    return false;
  }
  if (st === "trialing") {
    return subscriptionHasDefaultPaymentMethod(sub);
  }
  if (st === "active" || st === "past_due" || st === "canceled") {
    return true;
  }
  return false;
}

/** `crittr_pro_until` to store on `profiles`, or null when not entitled yet. */
export function deriveCrittrProUntilForProfile(
  sub: SubscriptionLike,
): string | null {
  if (!shouldGrantCrittrProFromSubscription(sub)) return null;
  return computeCrittrProUntil(sub);
}

export function computeCrittrProUntil(sub: SubscriptionLike): string | null {
  const st = sub.status;

  const endUnix = (): number | null => {
    if (st === "trialing") {
      return sub.trial_end ?? sub.current_period_end ?? null;
    }
    if (st === "active" || st === "past_due") {
      return sub.current_period_end ?? null;
    }
    if (st === "canceled" && sub.current_period_end) {
      return sub.current_period_end;
    }
    if (st === "incomplete" || st === "incomplete_expired") {
      return sub.trial_end ?? sub.current_period_end ?? null;
    }
    if (st === "unpaid" || st === "paused") {
      return null;
    }
    return sub.current_period_end ?? sub.trial_end ?? null;
  };

  const u = endUnix();
  if (u != null && u > 0) {
    return new Date(u * 1000).toISOString();
  }

  if (st === "canceled" && sub.current_period_end) {
    const endMs = sub.current_period_end * 1000;
    if (endMs > Date.now()) {
      return new Date(endMs).toISOString();
    }
  }

  return null;
}
