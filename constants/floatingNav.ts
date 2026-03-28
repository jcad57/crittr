/** Visual height of the pill bar (excluding outer margins / safe area). */
export const FLOATING_NAV_BAR_HEIGHT = 68;

/** Space below the bar + outer margin before the home indicator (see layout). */
export const FLOATING_NAV_OUTER_BOTTOM_GAP = 0;

/** Horizontal inset as % of screen width on each side → bar ≈ 92% width. */
export const FLOATING_NAV_HORIZONTAL_MARGIN_PERCENT = "4%" as const;

/** Extra scroll padding when the floating nav is hidden (e.g. add-pet, profile). */
export const SCROLL_PADDING_NO_FLOATING_NAV = 16;

/** Bottom padding for scroll views so content stays above the overlaid nav. */
export function getFloatingNavContentInsetBottom(safeBottom: number): number {
  return (
    FLOATING_NAV_BAR_HEIGHT + FLOATING_NAV_OUTER_BOTTOM_GAP + SCROLL_PADDING_NO_FLOATING_NAV + safeBottom
  );
}

/** Bottom inset when the nav is not shown (full-bleed screens). */
export function getContentInsetWithoutFloatingNav(safeBottom: number): number {
  return SCROLL_PADDING_NO_FLOATING_NAV + safeBottom;
}

/**
 * True only on the five main tab surfaces: home, activity, pets list, health, more.
 * Hidden on add-pet, pet detail, profile, and any other stack screen.
 */
export function shouldShowFloatingNav(
  segments: readonly string[],
  pathname: string,
): boolean {
  const s = segments as string[];
  if (s.includes("add-pet")) return false;
  if (s.includes("add-vet-visit")) return false;
  if (s.includes("profile")) return false;
  if (s.includes("pet") && !s.includes("pets")) return false;

  if (
    s.includes("dashboard") ||
    s.includes("activity") ||
    s.includes("pets") ||
    s.includes("health") ||
    s.includes("more")
  ) {
    return true;
  }

  const p = pathname.replace(/\/$/, "");
  if (p.includes("add-pet")) return false;
  if (p.includes("add-vet-visit")) return false;
  if (p.includes("profile")) return false;
  if (/\/pet\/[^/]+$/.test(p)) return false;

  return /\/(dashboard|activity|pets|health|more)$/.test(p);
}

/** Distance to translate the nav pill off-screen (bar + safe area + breathing room). */
export function getFloatingNavSlideOutDistance(safeBottom: number): number {
  return (
    FLOATING_NAV_BAR_HEIGHT +
    FLOATING_NAV_OUTER_BOTTOM_GAP +
    safeBottom +
    28
  );
}
