import { Colors } from "@/constants/colors";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export const SOCIAL_CIRCLE_SIZE = 52;
const SOCIAL_SHADOW_OFFSET = 3;
const SOCIAL_SNAP_MS = 50;

export default function SocialCircleButton({
  children,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const translateY = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.socialCircleWrapper}>
      <View style={styles.socialCircleShadow} />
      <Pressable
        style={styles.socialCircleHitArea}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          translateY.value = withTiming(SOCIAL_SHADOW_OFFSET, {
            duration: SOCIAL_SNAP_MS,
          });
        }}
        onPressOut={() => {
          translateY.value = withTiming(0, { duration: SOCIAL_SNAP_MS });
        }}
      >
        <Animated.View style={[styles.socialCircleFace, animatedStyle]}>
          {children}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  socialCircleWrapper: {
    width: SOCIAL_CIRCLE_SIZE,
    height: SOCIAL_CIRCLE_SIZE + SOCIAL_SHADOW_OFFSET,
  },
  socialCircleShadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SOCIAL_CIRCLE_SIZE,
    backgroundColor: Colors.black,
    borderRadius: SOCIAL_CIRCLE_SIZE / 2,
  },
  socialCircleHitArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  socialCircleFace: {
    width: SOCIAL_CIRCLE_SIZE,
    height: SOCIAL_CIRCLE_SIZE,
    borderRadius: SOCIAL_CIRCLE_SIZE / 2,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
});
