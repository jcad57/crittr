import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type OrangeButtonProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: ((e: GestureResponderEvent) => void) | null;
  onPressIn?: ((e: GestureResponderEvent) => void) | null;
  onPressOut?: ((e: GestureResponderEvent) => void) | null;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

const BUTTON_HEIGHT = 50;
const SHADOW_OFFSET = 5;
const SNAP_MS = 50;

function orangeButtonPressHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
}

export default function OrangeButton({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  loading,
  accessibilityLabel,
  accessibilityHint,
}: OrangeButtonProps) {
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.shadow} />
      <Pressable
        style={styles.hitArea}
        disabled={disabled || loading}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        onPressIn={(e) => {
          if (!(disabled || loading)) {
            orangeButtonPressHaptic();
          }
          translateY.value = withTiming(SHADOW_OFFSET, { duration: SNAP_MS });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          translateY.value = withTiming(0, { duration: SNAP_MS });
          onPressOut?.(e);
        }}
      >
        <Animated.View style={[styles.button, animatedStyle]}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.label}>{children}</Text>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    height: BUTTON_HEIGHT + SHADOW_OFFSET,
  },
  shadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: BUTTON_HEIGHT,
    backgroundColor: Colors.black,
    borderRadius: 999,
  },
  hitArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  button: {
    height: BUTTON_HEIGHT,
    backgroundColor: Colors.orange,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.white,
  },
});
