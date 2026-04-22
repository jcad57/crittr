import { styles } from "@/screen-styles/crittr-ai.styles";
import { useEffect } from "react";
import { View } from "react-native";
import Reanimated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export function TypingBubble() {
  const a0 = useSharedValue(0.35);
  const a1 = useSharedValue(0.35);
  const a2 = useSharedValue(0.35);

  useEffect(() => {
    const pulse = (v: SharedValue<number>, delayMs: number) => {
      v.value = withDelay(
        delayMs,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 360 }),
            withTiming(0.35, { duration: 360 }),
          ),
          -1,
          false,
        ),
      );
    };
    pulse(a0, 0);
    pulse(a1, 120);
    pulse(a2, 240);
  }, [a0, a1, a2]);

  const s0 = useAnimatedStyle(() => ({ opacity: a0.value }));
  const s1 = useAnimatedStyle(() => ({ opacity: a1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: a2.value }));

  return (
    <View
      style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}
      accessibilityLabel="CrittrAI is typing"
      accessibilityRole="text"
    >
      <View style={styles.typingRow}>
        <Reanimated.View style={[styles.typingDot, s0]} />
        <Reanimated.View style={[styles.typingDot, s1]} />
        <Reanimated.View style={[styles.typingDot, s2]} />
      </View>
    </View>
  );
}
