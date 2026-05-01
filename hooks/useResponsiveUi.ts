import {
  getResponsiveWindow,
  type ResponsiveWindow,
} from "@/lib/responsiveUi";
import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

export type ResponsiveUi = ResponsiveWindow & {
  windowWidth: number;
  windowHeight: number;
};

/**
 * Reactive window metrics + breakpoints for responsive layouts (tablet, expanded width, etc.).
 */
export function useResponsiveUi(): ResponsiveUi {
  const { width, height } = useWindowDimensions();

  return useMemo(
    () => ({
      ...getResponsiveWindow(width, height),
      windowWidth: width,
      windowHeight: height,
    }),
    [width, height],
  );
}

export {
  AUTH_CONTENT_MAX_WIDTH,
  AUTH_SCROLL_HORIZONTAL_PADDING_TOTAL,
  AUTH_STACK_HORIZONTAL_PADDING,
  EXPANDED_MIN_SHORTEST_SIDE,
  getAuthFlowColumnOuterWidth,
  getResponsiveWindow,
  getWelcomeCarouselSlideWidth,
  getWelcomeColumnOuterWidth,
  LAYOUT_REF_HEIGHT,
  LAYOUT_REF_WIDTH,
  TABLET_MIN_SHORTEST_SIDE,
  welcomeAuthLayoutScale,
  WELCOME_CONTAINER_PADDING_H,
  WELCOME_CONTENT_MAX_WIDTH,
  WELCOME_SCREEN_WRAPPER_PADDING_H,
  authContentColumnStyle,
  type ResponsiveBreakpoint,
  type ResponsiveWindow,
} from "@/lib/responsiveUi";
