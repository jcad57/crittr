import {
  getContentInsetWithoutFloatingNav,
  getFloatingNavContentInsetBottom,
  shouldShowFloatingNav,
} from "@/constants/floatingNav";
import { usePathname, useSegments } from "expo-router";
import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Scroll/content bottom padding: full inset when the tab bar is visible, smaller when it is hidden. */
export function useFloatingNavScrollInset(): number {
  const segments = useSegments();
  const pathname = usePathname();
  const { bottom } = useSafeAreaInsets();

  const navVisible = useMemo(
    () => shouldShowFloatingNav(segments, pathname),
    [segments, pathname],
  );

  return useMemo(
    () =>
      navVisible
        ? getFloatingNavContentInsetBottom(bottom)
        : getContentInsetWithoutFloatingNav(bottom),
    [navVisible, bottom],
  );
}
