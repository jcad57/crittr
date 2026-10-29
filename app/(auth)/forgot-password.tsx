import ScreenHeader from "@/components/ui/ScreenHeader";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import FormInput from "@/components/ui/form/FormInput";
import { createThemeValues, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { requestPasswordResetOtp } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import { maskEmailForPrivacy } from "@/utils/maskEmailForPrivacy";
import {
  firstSearchParam,
  looksLikeEmail,
} from "@/utils/passwordResetParams";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  const styles = useThemeValues(getStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sessionEmail = useAuthStore((s) => s.session?.user?.email ?? "").trim();
  const { email: emailParam } = useLocalSearchParams<{
    email?: string | string[];
  }>();
  const prefilledEmail = firstSearchParam(emailParam);

  const isSignedIn = Boolean(sessionEmail);
  const [email, setEmail] = useState(
    isSignedIn ? sessionEmail : prefilledEmail,
  );
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const targetEmail = (isSignedIn ? sessionEmail : email).trim();
  const fromGuest = !isSignedIn;

  const maskedEmail = useMemo(
    () => (sessionEmail ? maskEmailForPrivacy(sessionEmail) : ""),
    [sessionEmail],
  );

  const handleSend = async () => {
    Keyboard.dismiss();
    setSendError(null);
    setEmailError(null);

    if (!targetEmail) {
      if (isSignedIn) {
        setSendError(
          "No email is on file for this account, so we can't send a reset code here.",
        );
      } else {
        setEmailError("Please enter your email.");
      }
      return;
    }

    if (!isSignedIn && !looksLikeEmail(targetEmail)) {
      setEmailError("That email doesn't look right. Check it and try again.");
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordResetOtp(targetEmail);
      router.push({
        pathname: "/(auth)/reset-password-verify",
        params: {
          email: targetEmail,
          fromGuest: fromGuest ? "1" : "0",
        },
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
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace(
            isSignedIn ? "/(logged-in)/edit-account" : "/(auth)/sign-in",
          );
        }}
        topInset={insets.top + 4}
      />

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isSignedIn ? (
          <Text style={styles.lead}>
            We&apos;ll send a 6-digit code to{" "}
            <Text style={styles.emailStrong}>
              {maskedEmail || "your account email"}
            </Text>{" "}
            to reset your password. For security, you can&apos;t choose a
            different address during reset.
          </Text>
        ) : (
          <Text style={styles.lead}>
            Enter the email for your account. We&apos;ll send a 6-digit code to
            reset your password.
          </Text>
        )}

        {!isSignedIn ? (
          <FormInput
            icon="email-outline"
            placeholder="Email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (emailError) setEmailError(null);
              if (sendError) setSendError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            containerStyle={styles.emailField}
            error={Boolean(emailError)}
            errorMessage={emailError ?? undefined}
          />
        ) : null}

        {sendError ? <Text style={styles.errorText}>{sendError}</Text> : null}

        <OrangeButton
          onPress={handleSend}
          loading={submitting}
          disabled={submitting || (isSignedIn && !sessionEmail)}
          style={styles.cta}
        >
          Send reset code
        </OrangeButton>
      </KeyboardAwareScrollView>
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
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
  emailField: {
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
}));
