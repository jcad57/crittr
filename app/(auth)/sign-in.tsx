import AuthBackToWelcome from "@/components/onboarding/AuthBackToWelcome";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import SocialAuthContainer from "@/components/onboarding/SocialAuthContainer";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import FormInput from "@/components/ui/form/FormInput";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import {
  getAuthFlowColumnOuterWidth,
  welcomeAuthLayoutScale,
} from "@/hooks/useResponsiveUi";
import { getSigninMethodHint } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import { Colors } from "@/theme/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  Image as RNImage,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

function looksLikeInvalidPasswordAttempt(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("invalid login") ||
    m.includes("invalid credentials") ||
    m.includes("invalid grant")
  );
}

function mapSignInError(message: string): string {
  const m = message.toLowerCase();
  if (looksLikeInvalidPasswordAttempt(message)) {
    return "Incorrect email or password. Check your details and try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return message.trim() || "Something went wrong. Please try again.";
}

const ANIMALS_PEAKING = require("@/assets/images/animals-peaking.png");
const ANIMALS_PEAKING_RESOLVED = RNImage.resolveAssetSource(ANIMALS_PEAKING);
const ANIMALS_PEAKING_ASPECT =
  ANIMALS_PEAKING_RESOLVED?.width && ANIMALS_PEAKING_RESOLVED.width > 0
    ? ANIMALS_PEAKING_RESOLVED.height / ANIMALS_PEAKING_RESOLVED.width
    : 1;

function oauthPasswordHint(hint: "google" | "apple"): string {
  if (hint === "google") {
    return "This account was set up with Google. Use Continue with Google below to sign in.";
  }
  if (Platform.OS === "ios") {
    return "This account was set up with Apple. Use Continue with Apple below to sign in.";
  }
  return "This account was set up with Apple. Sign in on an iPhone or iPad, or add a password from your account settings.";
}

export default function SignIn() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { uiScale, verticalTight } = welcomeAuthLayoutScale(
    windowWidth,
    windowHeight,
  );
  const vs = (n: number) => Math.round(n * uiScale * verticalTight);

  const authColumnOuter = getAuthFlowColumnOuterWidth(windowWidth);
  const HERO_SCALE = 0.8;
  const heroWidth = Math.min(authColumnOuter * 0.52, 220) * HERO_SCALE;
  const heroHeight = heroWidth * ANIMALS_PEAKING_ASPECT;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);

  const handleSignIn = async () => {
    Keyboard.dismiss();
    setAuthError(null);
    setEmailError(null);
    setPasswordError(null);

    const trimmedEmail = email.trim();
    let invalid = false;

    if (!trimmedEmail) {
      setEmailError("Please enter your email.");
      invalid = true;
    }
    if (!password) {
      setPasswordError("Please enter your password.");
      invalid = true;
    }
    if (invalid) return;

    setSigningIn(true);
    try {
      await signInWithEmail(trimmedEmail, password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (trimmedEmail && looksLikeInvalidPasswordAttempt(msg)) {
        const hint = await getSigninMethodHint(trimmedEmail);
        if (hint === "google" || hint === "apple") {
          setAuthError(oauthPasswordHint(hint));
        } else {
          setAuthError(mapSignInError(msg));
        }
      } else {
        setAuthError(mapSignInError(msg));
      }
    } finally {
      setSigningIn(false);
    }
  };

  const emailHasErr = Boolean(emailError);
  const passwordHasErr = Boolean(passwordError);
  const authFailed = Boolean(authError);

  return (
    <OnboardingCard
      header={<AuthBackToWelcome />}
      centerContent
      welcomeBackground
    >
      <Text style={authOnboardingStyles.screenTitle}>Welcome Back!</Text>
      <Text style={authOnboardingStyles.screenSubtitle}>
        Sign in with your email and password
      </Text>

      <View
        style={[
          styles.peekSection,
          {
            marginTop: vs(20),
            marginBottom: vs(-5),
          },
        ]}
      >
        <Image
          source={ANIMALS_PEAKING}
          style={{ width: heroWidth, height: heroHeight, opacity: 0.85 }}
          contentFit="contain"
          accessibilityRole="image"
          accessibilityLabel="Decorative animals above the divider"
        />
      </View>

      <FormInput
        icon="email-outline"
        placeholder="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setEmailError(null);
          setAuthError(null);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        containerStyle={styles.inputSpacing}
        error={emailHasErr || authFailed}
        errorMessage={emailError ?? undefined}
      />

      <View style={styles.inputWithToggle}>
        <FormInput
          icon="lock-outline"
          placeholder="Password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setPasswordError(null);
            setAuthError(null);
          }}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          containerStyle={[styles.inputSpacing, styles.flexFill]}
          style={styles.inputPaddedRight}
          error={passwordHasErr || authFailed}
          errorMessage={passwordError || authError || undefined}
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
      <Pressable
        onPress={() => {
          const trimmed = email.trim();
          if (trimmed) {
            router.push({
              pathname: "/(auth)/forgot-password",
              params: { email: trimmed },
            });
          } else {
            router.push("/(auth)/forgot-password");
          }
        }}
        hitSlop={8}
        accessibilityRole="link"
        accessibilityLabel="Forgot password"
      >
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </Pressable>

      <OrangeButton
        onPress={handleSignIn}
        loading={signingIn}
        style={styles.cta}
      >
        Sign In
      </OrangeButton>
      <SocialAuthContainer
        disabled={signingIn}
        onError={setAuthError}
        onBeforeSignIn={() => {
          Keyboard.dismiss();
          setAuthError(null);
        }}
      />
      <Pressable
        style={authOnboardingStyles.linkRow}
        onPress={() => router.replace("/(auth)/(onboarding)?intent=signup")}
      >
        <Text style={authOnboardingStyles.linkMuted}>
          Don&apos;t have an account?{" "}
        </Text>
        <Text style={authOnboardingStyles.linkAccent}>Sign Up</Text>
      </Pressable>
    </OnboardingCard>
  );
}

const styles = StyleSheet.create({
  peekSection: {
    width: "100%",
    alignItems: "center",
    overflow: "visible",
  },
  forgotPassword: {
    textAlign: "right",
    color: Colors.orange,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "700",
  },
  inputSpacing: {
    marginBottom: 12,
  },
  inputWithToggle: {
    position: "relative",
    width: "100%",
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
  cta: {
    marginTop: 12,
  },
});
