/**
 * Maps a Stripe Subscription to `profiles.crittr_pro_until`.
 * Shared by stripe-webhook and sync-crittr-pro-entitlement.
 */

type SubscriptionLike = {
  status: string;
  trial_end: number | null;
  current_period_end: number | null;
};

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
