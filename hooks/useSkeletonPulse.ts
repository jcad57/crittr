import { useEffect } from "react";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/** Shared opacity pulse for dashboard skeleton placeholders (≈0.38 ↔ 1). */
export function useSkeletonPulse() {
  const opacity = useSharedValue(0.38);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, {
        duration: 900,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [opacity]);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
