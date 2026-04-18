import OtpDigitsInput, { OTP_LENGTH } from "@/components/auth/OtpDigitsInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useAuthStore } from "@/stores/authStore";
import {
  ONBOARDING_STEPS,
  useOnboardingStore,
} from "@/stores/onboardingStore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
  if (
    m.includes("already registered") ||
    m.includes("already confirmed") ||
    m.includes("user already")
  ) {
    return "This email may already be confirmed. Try signing in.";
  }
  return message || "Something went wrong. Please try again.";
}

export default function VerifyEmailStep() {
  const {
    accountData,
    goToStep,
    setEmailVerificationPending,
    setProfileBackAfterProfile,
  } = useOnboardingStore();
  const verifyEmailOtp = useAuthStore((s) => s.verifyEmailOtp);
  const resendSignupOtp = useAuthStore((s) => s.resendSignupOtp);

  const email = accountData.email.trim();
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

  const canConfirm = otp.length === OTP_LENGTH && !submitting;

  const maskedEmail = useMemo(() => {
    const [user, domain] = email.split("@");
    if (!domain || !user) return email;
    const u =
      user.length <= 2
        ? `${user[0] ?? ""}••`
        : `${user.slice(0, 2)}•••@${domain}`;
    return u;
  }, [email]);

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
    if (!canConfirm || !email) return;
    setSubmitting(true);
    setError(null);
    try {
      await verifyEmailOtp(email, otp);
      setEmailVerificationPending(false);
      setProfileBackAfterProfile("welcome");
      goToStep(ONBOARDING_STEPS.indexOf("profile"));
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
      await resendSignupOtp(email);
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
    <View style={styles.container}>
      <Text style={authOnboardingStyles.screenTitle}>Check your email</Text>
      <Text style={[authOnboardingStyles.screenSubtitle, styles.sub]}>
        We sent a {OTP_LENGTH}-digit code to{" "}
        <Text style={styles.emailStrong}>{maskedEmail}</Text>. Enter it below
        to confirm your account.
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
          <Text style={styles.resendMuted}>
            Resend in {cooldown}s
          </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  sub: {
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
