import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { updateAuthPassword } from "@/services/auth";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MIN_PASSWORD_LENGTH = 8;

function mapUpdatePasswordError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("same password") || m.includes("different password")) {
    return "Please choose a new password different from your current one.";
  }
  if (m.includes("weak") || m.includes("password should")) {
    return "Choose a stronger password (at least 8 characters).";
  }
  if (m.includes("session") || m.includes("jwt") || m.includes("auth")) {
    return "Your reset session has expired. Start over from the forgot password screen.";
  }
  if (m.includes("timed out") || m.includes("timeout")) {
    return "That took too long. Check your connection and try again.";
  }
  return message.trim() || "Couldn't update your password. Please try again.";
}

export default function ResetPasswordNewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      password.length >= MIN_PASSWORD_LENGTH &&
      password === confirm &&
      !submitting,
    [password, confirm, submitting],
  );

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setPasswordError(null);
    setConfirmError(null);
    setSubmitError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (password !== confirm) {
      setConfirmError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await updateAuthPassword(password);
      router.replace({
        pathname: "/(logged-in)/reset-password-success",
      } as Href);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSubmitError(mapUpdatePasswordError(msg));
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
          New password
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
          Choose a new password for your account. Enter it twice to confirm.
        </Text>

        <View style={styles.fieldGap}>
          <Text style={styles.fieldLabel}>New password</Text>
          <View style={styles.inputWithToggle}>
            <FormInput
              placeholder="At least 8 characters"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (passwordError) setPasswordError(null);
                if (submitError) setSubmitError(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              error={Boolean(passwordError)}
              errorMessage={passwordError ?? undefined}
              containerStyle={styles.flexFill}
              style={styles.inputPaddedRight}
            />
            <Pressable
              onPress={() => setShowPassword((s) => !s)}
              hitSlop={8}
              style={styles.eyeBtn}
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
            >
              <MaterialCommunityIcons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={Colors.gray500}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.fieldGap}>
          <Text style={styles.fieldLabel}>Confirm new password</Text>
          <View style={styles.inputWithToggle}>
            <FormInput
              placeholder="Re-enter new password"
              value={confirm}
              onChangeText={(v) => {
                setConfirm(v);
                if (confirmError) setConfirmError(null);
                if (submitError) setSubmitError(null);
              }}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              error={Boolean(confirmError)}
              errorMessage={confirmError ?? undefined}
              containerStyle={styles.flexFill}
              style={styles.inputPaddedRight}
            />
            <Pressable
              onPress={() => setShowConfirm((s) => !s)}
              hitSlop={8}
              style={styles.eyeBtn}
              accessibilityLabel={
                showConfirm ? "Hide password" : "Show password"
              }
            >
              <MaterialCommunityIcons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={Colors.gray500}
              />
            </Pressable>
          </View>
        </View>

        {submitError ? (
          <Text style={styles.errorText}>{submitError}</Text>
        ) : null}

        <OrangeButton
          onPress={handleSubmit}
          loading={submitting}
          disabled={!canSubmit}
          style={styles.cta}
        >
          Update password
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
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputWithToggle: {
    position: "relative",
  },
  flexFill: {
    width: "100%",
  },
  inputPaddedRight: {
    paddingRight: 32,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    height: 50,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  cta: {
    marginTop: 8,
  },
});
