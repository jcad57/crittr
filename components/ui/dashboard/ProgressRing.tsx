import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Ease-out fill when switching pets or updating progress. */
const FILL_MS = 700;

type ProgressRingProps = {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  trackColor: string;
  /**
   * When this changes (e.g. active pet id), the ring restarts from 0 and
   * eases out to `progress`. Same-key progress updates animate from the
   * current value.
   */
  animationKey?: string;
  children?: React.ReactNode;
};

export default function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
  animationKey,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressSV = useSharedValue(0);
  const prevKeyRef = useRef(animationKey);

  useEffect(() => {
    const clamped = Math.min(Math.max(progress, 0), 1);
    const keyChanged = prevKeyRef.current !== animationKey;
    prevKeyRef.current = animationKey;

    if (keyChanged) {
      progressSV.value = 0;
    }

    progressSV.value = withTiming(clamped, {
      duration: FILL_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animationKey, progressSV]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progressSV.value),
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
