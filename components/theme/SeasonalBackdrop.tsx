import { memo, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, AppState, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useSeasonalTheme } from "@/theme/colors";
import { SEASONAL_THEMES } from "@/theme/seasonalThemes";

const LEAF_PATHS = [
  "M12 23V17L4 19L6 14L1 10L7 9L6 4L10 6L12 0L15 6L19 4L18 10L23 11L18 15L20 19L14 17L13 23Z",
  "M12 23C12 18 10 17 6 14C1 10 4 3 19 1C22 14 18 19 13 19L13 23Z",
  "M12 23L11 19C5 20 2 17 5 14C0 12 3 8 6 8C3 4 8 2 11 4C11 0 16 0 17 4C22 3 24 8 20 10C24 14 20 18 15 18L13 23Z",
];

type ParticleSpec = { x: number; phase: number; size: number; opacity: number; cycles: number; sway: number; shape: number; color: string };
const fraction = (index: number, salt: number) => ((index * 73 + salt * 37) % 101) / 101;

const Particle = memo(function Particle({ spec, clock, width, height, leaves }: {
  spec: ParticleSpec; clock: SharedValue<number>; width: number; height: number; leaves: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = (clock.value * spec.cycles + spec.phase) % 1;
    const wave = Math.sin(progress * Math.PI * 2 + spec.phase * 6);
    const fade = Math.min(1, progress * 12, (1 - progress) * 12);
    return {
      opacity: spec.opacity * fade,
      transform: [
        { translateX: spec.x * width + wave * spec.sway },
        { translateY: -32 + progress * (height + 64) },
        { rotate: `${leaves ? progress * 260 + spec.phase * 360 : spec.shape === 1 ? 45 : 0}deg` },
        { scaleX: leaves ? 0.75 + wave * 0.2 : 1 },
      ],
    };
  });
  return (
    <Animated.View style={[styles.particle, { width: spec.size, height: spec.size }, animatedStyle]}>
      {leaves ? (
        <Svg width="100%" height="100%" viewBox="0 0 24 24">
          <Path d={LEAF_PATHS[spec.shape]} fill={spec.color} />
          <Path d="M12 20L13 7M12 14L8 11M13 12L17 8" stroke={spec.color} strokeWidth={0.7} fill="none" />
        </Svg>
      ) : spec.shape === 2 ? (
        <Svg width="100%" height="100%" viewBox="0 0 12 12">
          <Path d="M6 0V12M.8 3L11.2 9M.8 9L11.2 3" stroke={spec.color} strokeWidth={1.3} strokeLinecap="round" />
        </Svg>
      ) : <View style={{ flex: 1, borderRadius: spec.shape === 0 ? spec.size : 1, backgroundColor: spec.color }} />}
    </Animated.View>
  );
});

/** One small particle field behind the navigator; no timers or React work per frame. */
export default function SeasonalBackdrop() {
  const { enabled, season, preview } = useSeasonalTheme();
  const config = SEASONAL_THEMES[preview ?? (enabled ? season : "summer")].particles;
  const { width, height } = useWindowDimensions();
  const [active, setActive] = useState(AppState.currentState === "active");
  const [reduceMotion, setReduceMotion] = useState(true);
  const clock = useSharedValue(0);
  const leaves = config?.kind === "leaves";
  const particles = useMemo<ParticleSpec[]>(() => config ? Array.from({ length: leaves ? 14 : 22 }, (_, index) => {
    const depth = fraction(index, 5);
    return {
      x: fraction(index, 1), phase: fraction(index, 2),
      size: leaves ? 9 + depth * 12 : 2.5 + depth * 5,
      opacity: leaves ? 0.16 + depth * 0.16 : 0.3 + depth * 0.32,
      cycles: (leaves ? 3 : 4) + index % 3,
      sway: (leaves ? 14 : 5) + depth * (leaves ? 24 : 12),
      shape: index % 3, color: config.colors[index % config.colors.length],
    };
  }) : [], [config, leaves]);

  useEffect(() => {
    let disposed = false;
    let motionEventReceived = false;
    const app = AppState.addEventListener("change", (state) => setActive(state === "active"));
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      motionEventReceived = true;
      setReduceMotion(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!disposed && !motionEventReceived) setReduceMotion(value);
    }).catch(() => undefined);
    return () => { disposed = true; app.remove(); motion.remove(); };
  }, []);

  useEffect(() => {
    if (config && active && !reduceMotion) {
      clock.value = 0;
      clock.value = withRepeat(withTiming(1, { duration: 120_000, easing: Easing.linear }), -1, false);
    }
    return () => cancelAnimation(clock);
  }, [active, clock, config, reduceMotion]);

  if (!config || !active || reduceMotion) return null;
  return (
    <View style={styles.field} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {particles.map((spec, index) => <Particle key={`${config.kind}-${index}`} spec={spec} clock={clock} width={width} height={height} leaves={leaves} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  particle: { position: "absolute", top: 0, left: 0 },
});
