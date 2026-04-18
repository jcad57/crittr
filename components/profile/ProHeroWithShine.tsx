import {
  PRO_BANNER_SHINE_BORDER_LOCATIONS,
  PRO_GRADIENT_END,
  PRO_GRADIENT_START,
  type ProBannerThemeId,
  resolveProBannerTheme,
} from "@/constants/proBannerThemes";
import { useDeviceTiltShared } from "@/hooks/useDeviceTiltShared";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
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

const styles = StyleSheet.create({
  heroProWrapper: {
    marginBottom: 22,
    position: "relative",
  },
  heroProWrapperCompact: {
    marginBottom: 12,
  },
  heroCardProBorder: {
    borderRadius: HERO_RADIUS,
    position: "relative",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
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
  heroCardProInnerContentCompact: {
    padding: 14,
    gap: 10,
  },
});

type Props = {
  children: ReactNode;
  themeId?: ProBannerThemeId;
  /** When set, the hero area is tappable (child avatar `Pressable` still receives its own taps). */
  onBannerPress?: () => void;
  /** Smaller padding/margins for theme-picker previews. */
  compact?: boolean;
};

export default function ProHeroWithShine({
  children,
  themeId = "slate",
  onBannerPress,
  compact = false,
}: Props) {
  const theme = resolveProBannerTheme(themeId);
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

  const innerContentStyle = [
    styles.heroCardProInnerContent,
    compact && styles.heroCardProInnerContentCompact,
  ];

  const innerBody = onBannerPress ? (
    <Pressable
      onPress={onBannerPress}
      style={innerContentStyle}
      accessibilityRole="button"
      accessibilityLabel="Customize Pro banner appearance"
      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
    >
      {children}
    </Pressable>
  ) : (
    <View style={innerContentStyle}>{children}</View>
  );

  return (
    <View
      style={[
        styles.heroProWrapper,
        compact && styles.heroProWrapperCompact,
      ]}
    >
      <View
        style={[
          styles.heroCardProBorder,
          styles.heroCardProRing,
          {
            shadowColor: theme.cardShadowColor,
          },
        ]}
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
              colors={
                [...theme.shineBorderColors] as [string, string, ...string[]]
              }
              locations={
                [...PRO_BANNER_SHINE_BORDER_LOCATIONS] as [
                  number,
                  number,
                  ...number[],
                ]
              }
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
                theme.innerGradient.colors as [string, string, ...string[]]
              }
              locations={
                theme.innerGradient.locations as [
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
          {innerBody}
        </View>
      </View>
    </View>
  );
}
