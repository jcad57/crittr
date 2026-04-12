import {
  PRO_GRADIENT_END,
  PRO_GRADIENT_START,
  PRO_HERO_INNER_GRADIENT,
} from "@/constants/proHeroGoldGradient";
import { useDeviceTiltShared } from "@/hooks/useDeviceTiltShared";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const HERO_RADIUS = 24;
const INNER_GRADIENT_OVERSCAN = 0.42;
const HERO_BORDER = 3;

const PRO_SHINE_BORDER_COLORS = [
  "#5C4008",
  "#8B6914",
  "#C9A012",
  "#FFF8DC",
  "#FFE566",
  "#FFF8DC",
  "#C9A012",
  "#8B6914",
  "#5C4008",
] as const;
const PRO_SHINE_LOCATIONS = [
  0, 0.12, 0.28, 0.45, 0.52, 0.6, 0.75, 0.88, 1,
] as const;

const styles = StyleSheet.create({
  heroProWrapper: {
    marginBottom: 22,
    position: "relative",
  },
  heroCardProBorder: {
    borderRadius: HERO_RADIUS,
    position: "relative",
    shadowColor: "#FF8F00",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 26,
    elevation: 10,
  },
  heroCardProRing: {
    overflow: "hidden",
  },
  heroProShineSpinner: {
    position: "absolute",
  },
  heroCardProInnerClip: {
    margin: HERO_BORDER,
    borderRadius: HERO_RADIUS - HERO_BORDER,
    overflow: "hidden",
    zIndex: 1,
    position: "relative",
  },
  heroCardProInnerGradientWrap: {
    position: "absolute",
    borderRadius: HERO_RADIUS - HERO_BORDER,
  },
  heroCardProInnerContent: {
    padding: 17,
    gap: 14,
    position: "relative",
    zIndex: 1,
  },
});

export default function ProHeroWithShine({ children }: { children: ReactNode }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const rotation = useSharedValue(0);
  const { tiltX, tiltY } = useDeviceTiltShared(Platform.OS !== "web");

  const innerGradientShiftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * 36 },
      { translateY: tiltY.value * 28 },
    ],
  }));

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const spinSize = box.w > 0 && box.h > 0 ? Math.max(box.w, box.h) * 2.75 : 0;
  const spinLeft = box.w > 0 ? (box.w - spinSize) / 2 : 0;
  const spinTop = box.h > 0 ? (box.h - spinSize) / 2 : 0;

  return (
    <View style={styles.heroProWrapper}>
      <View
        style={[styles.heroCardProBorder, styles.heroCardProRing]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setBox({ w: width, h: height });
        }}
      >
        {spinSize > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heroProShineSpinner,
              {
                width: spinSize,
                height: spinSize,
                left: spinLeft,
                top: spinTop,
              },
              spinStyle,
            ]}
          >
            <LinearGradient
              colors={[...PRO_SHINE_BORDER_COLORS]}
              locations={[...PRO_SHINE_LOCATIONS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        ) : null}
        <View style={styles.heroCardProInnerClip}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heroCardProInnerGradientWrap,
              {
                left: `${-INNER_GRADIENT_OVERSCAN * 50}%`,
                top: `${-INNER_GRADIENT_OVERSCAN * 50}%`,
                width: `${100 + INNER_GRADIENT_OVERSCAN * 100}%`,
                height: `${100 + INNER_GRADIENT_OVERSCAN * 100}%`,
              },
              innerGradientShiftStyle,
            ]}
          >
            <LinearGradient
              colors={
                PRO_HERO_INNER_GRADIENT.colors as [string, string, ...string[]]
              }
              locations={
                PRO_HERO_INNER_GRADIENT.locations as [
                  number,
                  number,
                  ...number[],
                ]
              }
              start={PRO_GRADIENT_START}
              end={PRO_GRADIENT_END}
              style={StyleSheet.absoluteFillObject}
              dither
            />
          </Animated.View>
          <View style={styles.heroCardProInnerContent}>{children}</View>
        </View>
      </View>
    </View>
  );
}
