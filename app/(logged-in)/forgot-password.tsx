import ScreenHeader from "@/components/ui/ScreenHeader";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { requestPasswordResetOtp } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import { maskEmailForPrivacy } from "@/utils/maskEmailForPrivacy";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function mapResetRequestError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate") || m.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "That email doesn't look right. Check it and try again.";
  }
  return message.trim() || "Something went wrong. Please try again.";
}

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const accountEmail = useAuthStore((s) => s.session?.user?.email ?? "").trim();

  const maskedEmail = useMemo(
    () => (accountEmail ? maskEmailForPrivacy(accountEmail) : ""),
    [accountEmail],
  );

  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async () => {
    Keyboard.dismiss();
    setSendError(null);

    if (!accountEmail) {
      setSendError(
        "No email is on file for this account, so we can't send a reset code here.",
      );
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordResetOtp(accountEmail);
      router.push({
        pathname: "/(logged-in)/reset-password-verify",
        params: { email: accountEmail },
      } as Href);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSendError(mapResetRequestError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Forgot password"
        onBack={() => router.back()}
        topInset={insets.top + 4}
      />

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          We&apos;ll send a 6-digit code to{" "}
          <Text style={styles.emailStrong}>
            {accountEmail ? maskedEmail : "your account email"}
          </Text>{" "}
          to reset your password. For security, you can&apos;t choose a
          different address during reset.
        </Text>

        {sendError ? <Text style={styles.errorText}>{sendError}</Text> : null}

        <OrangeButton
          onPress={handleSend}
          loading={submitting}
          disabled={submitting || !accountEmail}
          style={styles.cta}
        >
          Send reset code
        </OrangeButton>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
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
    marginBottom: 16,
  },
  emailStrong: {
    fontFamily: Font.uiSemiBold,
    color: Colors.textPrimary,
  },
  errorText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    marginTop: 4,
    marginBottom: 8,
  },
  cta: {
    marginTop: 16,
  },
});
