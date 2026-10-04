import type { Href } from "expo-router";

export const UPGRADE_HREF: Href = "/(logged-in)/upgrade";

/** Shown after onboarding finish — upgrade screen shows “No thanks” → dashboard. */
export const UPGRADE_FROM_ONBOARDING_HREF: Href =
  "/(logged-in)/upgrade?fromOnboarding=1";

export function upgradeHref(opts?: {
  returnTo?: string;
  fromOnboarding?: boolean;
}): Href {
  const q = new URLSearchParams();
  if (opts?.fromOnboarding) q.set("fromOnboarding", "1");
  if (opts?.returnTo) q.set("returnTo", opts.returnTo);
  const qs = q.toString();
  return (qs ? `/(logged-in)/upgrade?${qs}` : "/(logged-in)/upgrade") as Href;
}

/** Destination after a successful purchase, restore, or existing-entitlement activation. */
export function postPurchaseHref(returnTo?: string | null): Href {
  if (returnTo === "subscriptions") return "/(logged-in)/subscriptions";
  if (returnTo === "settings") return "/(logged-in)/settings";
  return "/(logged-in)/welcome-to-pro";
}
