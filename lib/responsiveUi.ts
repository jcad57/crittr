import type { ViewStyle } from "react-native";

/**
 * Horizontal padding on welcome (`WelcomeContent` screen wrapper). Matches onboarding outer gutter.
 */
export const WELCOME_SCREEN_WRAPPER_PADDING_H = 24;

/**
 * Inner horizontal padding on welcome (`styles.container`).
 */
export const WELCOME_CONTAINER_PADDING_H = 8;

/**
 * `OnboardingCard` scroll body horizontal padding (one side).
 */
export const AUTH_STACK_HORIZONTAL_PADDING = 24;

export const AUTH_SCROLL_HORIZONTAL_PADDING_TOTAL =
  AUTH_STACK_HORIZONTAL_PADDING * 2;

/** Shortest screen edge at or above — treat as tablet / roomy layout for responsive branching. */
export const TABLET_MIN_SHORTEST_SIDE = 600;

/** Expanded breakpoint — large tablets and regular-width size class-ish layouts. */
export const EXPANDED_MIN_SHORTEST_SIDE = 768;

/**
 * Max readable column for dense forms (sign-in, sign-up, onboarding steps).
 * Phones stay full-width inside gutters; wider surfaces center a capped column.
 */
export const AUTH_CONTENT_MAX_WIDTH = 440;

/**
 * Welcome/marketing column — slightly wider than auth forms for carousel + headline.
 */
export const WELCOME_CONTENT_MAX_WIDTH = 520;

/** Design reference for auth/welcome typography scaling (iPhone 14-ish). */
export const LAYOUT_REF_WIDTH = 390;
export const LAYOUT_REF_HEIGHT = 844;

export type ResponsiveBreakpoint = "compact" | "regular" | "expanded";

export type ResponsiveWindow = {
  width: number;
  height: number;
  shortestSide: number;
  longestSide: number;
  isTablet: boolean;
  isLandscape: boolean;
  breakpoint: ResponsiveBreakpoint;
  /** Room for future sidebar / multi-column layouts (e.g. iPad landscape). */
  prefersExpandedHorizontalLayout: boolean;
};

/**
 * Snapshot responsive classification from window dimensions (no hooks — safe anywhere).
 */
export function getResponsiveWindow(
  width: number,
  height: number,
): ResponsiveWindow {
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  const isTablet = shortestSide >= TABLET_MIN_SHORTEST_SIDE;
  const isLandscape = width > height;

  let breakpoint: ResponsiveBreakpoint = "compact";
  if (shortestSide >= EXPANDED_MIN_SHORTEST_SIDE) breakpoint = "expanded";
  else if (shortestSide >= TABLET_MIN_SHORTEST_SIDE) breakpoint = "regular";

  return {
    width,
    height,
    shortestSide,
    longestSide,
    isTablet,
    isLandscape,
    breakpoint,
    prefersExpandedHorizontalLayout:
      width >= 900 && shortestSide >= TABLET_MIN_SHORTEST_SIDE,
  };
}

/**
 * Scale typography & spacing for welcome + auth stacks (clamped so large canvases don’t scale up excessively).
 */
export function welcomeAuthLayoutScale(width: number, height: number) {
  const widthScale = Math.min(Math.max(width / LAYOUT_REF_WIDTH, 0.86), 1.12);
  const heightScale = Math.min(Math.max(height / LAYOUT_REF_HEIGHT, 0.9), 1.06);
  const uiScale = Math.min(widthScale, heightScale * 1.02);
  const verticalTight = Math.min(1, height / 720);
  return { uiScale, verticalTight };
}

/** Outer column width inside welcome screen wrapper (before inner container padding). */
export function getWelcomeColumnOuterWidth(windowWidth: number): number {
  return Math.min(
    windowWidth - WELCOME_SCREEN_WRAPPER_PADDING_H * 2,
    WELCOME_CONTENT_MAX_WIDTH,
  );
}

/** FlatList slide width inside welcome inner container. */
export function getWelcomeCarouselSlideWidth(windowWidth: number): number {
  return Math.max(
    0,
    getWelcomeColumnOuterWidth(windowWidth) - WELCOME_CONTAINER_PADDING_H * 2,
  );
}

/**
 * Effective width for sizing heroes/illustrations in auth screens that share onboarding horizontal gutters.
 */
export function getAuthFlowColumnOuterWidth(windowWidth: number): number {
  return Math.min(
    windowWidth - AUTH_SCROLL_HORIZONTAL_PADDING_TOTAL,
    AUTH_CONTENT_MAX_WIDTH,
  );
}

/** Centers a capped-width column inside a full-bleed padded parent. */
export function authContentColumnStyle(): Pick<
  ViewStyle,
  "width" | "maxWidth" | "alignSelf"
> {
  return {
    width: "100%",
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    alignSelf: "center",
  };
}
