import type { Href } from "expo-router";

export const UPGRADE_HREF: Href = "/(logged-in)/upgrade";

/** Shown after onboarding finish — upgrade screen shows “No thanks” → dashboard. */
export const UPGRADE_FROM_ONBOARDING_HREF: Href =
  "/(logged-in)/upgrade?fromOnboarding=1";
