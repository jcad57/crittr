import { mapNativeSocialError } from "@/lib/auth/nativeSocial";
import { useAuthStore } from "@/stores/authStore";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import GoogleGIcon from "./GoogleGIcon";

type Props = {
  disabled?: boolean;
  onError?: (message: string) => void;
  /** e.g. clear field errors, set onboarding flags before the native sheet opens. */
  onBeforeSignIn?: () => void;
};

const BUTTON_HEIGHT = 50;
const SHADOW_OFFSET = 5;
const SNAP_MS = 50;

function pressHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
}

/**
 * Native Google (iOS + Android) and Apple (iOS only) sign-in buttons.
 * Apple is omitted on Android so the control is never a dead tap target.
 */
export default function SocialAuthContainer({
  disabled = false,
  onError,
  onBeforeSignIn,
}: Props) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const busy = disabled || googleLoading || appleLoading;
  const showApple = Platform.OS === "ios";

  const run = async (
    provider: "google" | "apple",
    action: () => Promise<void>,
    setLoading: (v: boolean) => void,
  ) => {
    onBeforeSignIn?.();
    setLoading(true);
    try {
      await action();
    } catch (e: unknown) {
      onError?.(mapNativeSocialError(e, provider));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orLabel}>or</Text>
        <View style={styles.orLine} />
      </View>

      {showApple ? (
        <SocialAuthButton
          variant="apple"
          label="Continue with Apple"
          loading={appleLoading}
          disabled={busy}
          onPress={() => run("apple", signInWithApple, setAppleLoading)}
        >
          <MaterialCommunityIcons name="apple" size={22} color={Colors.white} />
        </SocialAuthButton>
      ) : null}

      <SocialAuthButton
        variant="google"
        label="Continue with Google"
        loading={googleLoading}
        disabled={busy}
        onPress={() => run("google", signInWithGoogle, setGoogleLoading)}
      >
        <GoogleGIcon size={20} />
      </SocialAuthButton>
    </View>
  );
}

function SocialAuthButton({
  variant,
  label,
  loading,
  disabled,
  onPress,
  children,
}: {
  variant: "google" | "apple";
  label: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const translateY = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const isApple = variant === "apple";

  return (
    <View style={styles.btnWrapper}>
      <View style={styles.btnShadow} />
      <Pressable
        style={styles.btnHitArea}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => {
          if (!disabled) pressHaptic();
          translateY.value = withTiming(SHADOW_OFFSET, { duration: SNAP_MS });
        }}
        onPressOut={() => {
          translateY.value = withTiming(0, { duration: SNAP_MS });
        }}
      >
        <Animated.View
          style={[
            styles.btnFace,
            isApple ? styles.btnFaceApple : styles.btnFaceGoogle,
            animatedStyle,
          ]}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={isApple ? Colors.white : Colors.gray700}
            />
          ) : (
            <>
              <View style={styles.btnIcon}>{children}</View>
              <Text
                style={[
                  styles.btnLabel,
                  isApple ? styles.btnLabelApple : styles.btnLabelGoogle,
                ]}
              >
                {label}
              </Text>
            </>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  wrap: {
    width: "100%",
    marginTop: 8,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray200,
  },
  orLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  btnWrapper: {
    width: "100%",
    height: BUTTON_HEIGHT + SHADOW_OFFSET,
    marginBottom: 10,
  },
  btnShadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: BUTTON_HEIGHT,
    backgroundColor: Colors.black,
    borderRadius: 999,
  },
  btnHitArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  btnFace: {
    height: BUTTON_HEIGHT,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 10,
  },
  btnFaceApple: {
    backgroundColor: Colors.gray800,
  },
  btnFaceGoogle: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  btnIcon: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  btnLabel: {
    fontFamily: Font.uiBold,
    fontSize: 16,
  },
  btnLabelApple: {
    color: Colors.white,
  },
  btnLabelGoogle: {
    color: Colors.textPrimary,
  },
}));
