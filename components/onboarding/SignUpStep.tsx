import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { signInWithGoogle } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignUpStep() {
  const router = useRouter();
  const { accountData, setAccountData, nextStep } = useOnboardingStore();
  const signUp = useAuthStore((s) => s.signUp);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    accountData.firstName.trim() &&
    accountData.lastName.trim() &&
    accountData.email.trim() &&
    accountData.password.length >= 6;

  const handleCreateAccount = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await signUp(
        accountData.email.trim(),
        accountData.password,
        accountData.firstName.trim(),
        accountData.lastName.trim(),
      );
      nextStep();
    } catch (error: any) {
      Alert.alert("Sign Up Failed", error.message ?? "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Welcome to Crittr!</Text>

      {/* Animal icons */}
      <View style={styles.iconRow}>
        <MaterialCommunityIcons name="cat" size={26} color={Colors.gray800} />
        <MaterialCommunityIcons name="dog" size={26} color={Colors.gray800} />
        <MaterialCommunityIcons
          name="rabbit"
          size={26}
          color={Colors.gray800}
        />
      </View>

      {/* Social auth */}
      <Text style={styles.socialLabel}>Sign up with</Text>
      <View style={styles.socialRow}>
        <TouchableOpacity
          style={styles.socialCircle}
          onPress={signInWithGoogle}
        >
          <MaterialCommunityIcons
            name="google"
            size={22}
            color={Colors.gray500}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialCircle} disabled>
          <MaterialCommunityIcons
            name="apple"
            size={22}
            color={Colors.gray500}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialCircle} disabled>
          <MaterialCommunityIcons
            name="facebook"
            size={22}
            color={Colors.gray500}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Name row */}
      <View style={styles.nameRow}>
        <FormInput
          placeholder="First Name"
          value={accountData.firstName}
          onChangeText={(v) => setAccountData({ firstName: v })}
          containerStyle={styles.halfInput}
          autoCapitalize="words"
        />
        <FormInput
          placeholder="Last Name"
          value={accountData.lastName}
          onChangeText={(v) => setAccountData({ lastName: v })}
          containerStyle={styles.halfInput}
          autoCapitalize="words"
        />
      </View>

      {/* Email */}
      <FormInput
        icon="email-outline"
        placeholder="Email"
        value={accountData.email}
        onChangeText={(v) => setAccountData({ email: v })}
        keyboardType="email-address"
        autoCapitalize="none"
        containerStyle={styles.inputSpacing}
      />

      {/* Password */}
      <FormInput
        icon="lock-outline"
        placeholder="Password"
        value={accountData.password}
        onChangeText={(v) => setAccountData({ password: v })}
        secureTextEntry
        containerStyle={styles.inputSpacing}
      />

      {/* Terms */}
      <Text style={styles.terms}>
        I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text>
      </Text>

      {/* Create Account */}
      <OrangeButton
        onPress={handleCreateAccount}
        disabled={!canSubmit || isSubmitting}
        style={styles.cta}
      >
        {isSubmitting ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          "Create Account"
        )}
      </OrangeButton>

      <View style={styles.divider} />

      {/* Sign In link */}
      <Text style={styles.signInLabel}>Already have an account?</Text>
      <Pressable
        style={styles.signInButton}
        onPress={() => router.replace("/(auth)/sign-in")}
      >
        <Text style={styles.signInButtonText}>Log In</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  socialLabel: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 12,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 20,
  },
  socialCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray50,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: 20,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputSpacing: {
    marginBottom: 12,
  },
  terms: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  termsLink: {
    color: Colors.orange,
    fontFamily: "InstrumentSans-Bold",
  },
  cta: {
    marginTop: 12,
  },
  signInLabel: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  signInButton: {
    height: 50,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  signInButtonText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 16,
    color: Colors.textPrimary,
  },
});
