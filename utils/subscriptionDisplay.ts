/**
 * Display helpers for the subscription management screen (RevenueCat-backed).
 */

export function formatStatus(status: string): string {
  switch (status) {
    case "trialing":
      return "Trial";
    case "active":
      return "Active";
    case "billing_issue":
      return "Billing issue";
    case "canceled":
      return "Canceled";
    case "expired":
      return "Expired";
    default:
      return status.replace(/_/g, " ");
  }
}

export function formatSubscriptionDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}
