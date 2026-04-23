import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { requestPasswordResetOtp } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
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
  const sessionEmail = useAuthStore((s) => s.session?.user?.email ?? "");

  const [email, setEmail] = useState(sessionEmail);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async () => {
    Keyboard.dismiss();
    setEmailError(null);
    setSendError(null);

    const trimmed = email.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!trimmed) {
      setEmailError("Please enter your email.");
      return;
    }
    if (!emailOk) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordResetOtp(trimmed);
      router.push({
        pathname: "/(logged-in)/reset-password-verify",
        params: { email: trimmed },
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
          Forgot password
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
          Enter the email associated with your account and we&apos;ll send a
          6-digit code to reset your password.
        </Text>

        <FormInput
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (emailError) setEmailError(null);
            if (sendError) setSendError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={Boolean(emailError)}
          errorMessage={emailError ?? undefined}
          containerStyle={styles.fieldGap}
        />

        {sendError ? <Text style={styles.errorText}>{sendError}</Text> : null}

        <OrangeButton
          onPress={handleSend}
          loading={submitting}
          disabled={submitting}
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
  fieldGap: {
    marginBottom: 8,
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
