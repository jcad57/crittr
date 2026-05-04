import OtpDigitsInput, { OTP_LENGTH } from "@/components/auth/OtpDigitsInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
} from "@/services/auth";
import { maskEmailForPrivacy } from "@/utils/maskEmailForPrivacy";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RESEND_COOLDOWN_SEC = 60;

function mapOtpError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("expired") || m.includes("otp_expired")) {
    return "This code has expired. Request a new one.";
  }
  if (m.includes("invalid") || m.includes("token")) {
    return "That code doesn’t match. Check the email and try again.";
  }
  if (
    m.includes("rate") ||
    m.includes("too many") ||
    m.includes("only request") ||
    m.includes("email rate limit")
  ) {
    return "Please wait a minute before requesting another code.";
  }
  return message || "Something went wrong. Please try again.";
}

export default function ResetPasswordVerifyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{
    email?: string | string[];
  }>();
  const email = (Array.isArray(emailParam) ? emailParam[0] : emailParam ?? "")
    .trim();

  const [otp, setOtp] = useState("");
  const [otpFieldKey, setOtpFieldKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const clearCooldownInterval = useCallback(() => {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearCooldownInterval(), [clearCooldownInterval]);

  const canConfirm = otp.length === OTP_LENGTH && !submitting && !!email;

  const maskedEmail = useMemo(() => maskEmailForPrivacy(email), [email]);

  const tickCooldown = useCallback(() => {
    clearCooldownInterval();
    setCooldown(RESEND_COOLDOWN_SEC);
    cooldownIntervalRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearCooldownInterval();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [clearCooldownInterval]);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    setError(null);
    try {
      await verifyPasswordResetOtp(email, otp);
      router.replace({
        pathname: "/(logged-in)/reset-password-new",
        params: { email },
      } as Href);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
      setError(mapOtpError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0 || resending) return;
    setOtp("");
    setOtpFieldKey((k) => k + 1);
    setError(null);
    setSubmitting(false);
    setResending(true);
    try {
      await requestPasswordResetOtp(email);
      tickCooldown();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
      setError(mapOtpError(msg));
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.navBar, { paddingTop: insets.top + 4 }]}>
        <Pressable
          style={styles.navButton}
          hitSlop={12}
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          Check your email
        </Text>
        <View style={styles.navButton} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          We sent a {OTP_LENGTH}-digit code to{" "}
          <Text style={styles.emailStrong}>{maskedEmail}</Text>. Enter it below
          to continue resetting your password.
        </Text>

        <Text style={styles.label}>Verification code</Text>
        <OtpDigitsInput
          key={otpFieldKey}
          value={otp}
          onChange={(v) => {
            setOtp(v.replace(/\D/g, "").slice(0, OTP_LENGTH));
            if (error) setError(null);
          }}
          error={Boolean(error)}
          disabled={submitting}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <OrangeButton
          onPress={handleConfirm}
          loading={submitting}
          disabled={!canConfirm}
          style={styles.cta}
        >
          Confirm
        </OrangeButton>

        <View style={styles.resendRow}>
          <Text style={styles.resendMuted}>Didn&apos;t get it?</Text>
          {cooldown > 0 ? (
            <Text style={styles.resendMuted}>Resend in {cooldown}s</Text>
          ) : (
            <Pressable
              onPress={handleResend}
              disabled={resending || !email}
              hitSlop={8}
            >
              {resending ? (
                <ActivityIndicator color={Colors.orange} size="small" />
              ) : (
                <Text style={styles.resendLink}>Resend code</Text>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.cream,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  emailStrong: {
    fontFamily: Font.uiSemiBold,
    color: Colors.textPrimary,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 10,
    alignSelf: "stretch",
  },
  errorText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  cta: {
    marginTop: 24,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 20,
  },
  resendMuted: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  resendLink: {
    fontFamily: Font.uiBold,
    fontSize: 15,
    color: Colors.orange,
  },
});
