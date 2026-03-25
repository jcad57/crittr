import FormInput from "@/components/onboarding/FormInput";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { signInWithGoogle } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signInWithEmail } = useAuthStore();

  const handleSignIn = async () => {
    try {
      await signInWithEmail(email, password);
    } catch (error: any) {
      Alert.alert("Sign In Failed", error.message ?? "Something went wrong.");
    }
  };

  return (
    <OnboardingCard>
      {/* Title */}
      <Text style={styles.title}>Welcome Back!</Text>

      {/* Social auth */}
      <Text style={styles.socialLabel}>Sign in with</Text>
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

      {/* Email */}
      <FormInput
        icon="email-outline"
        placeholder="Email"
        value={email}
        onChangeText={(v) => setEmail(v)}
        keyboardType="email-address"
        autoCapitalize="none"
        containerStyle={styles.inputSpacing}
      />

      {/* Password */}
      <FormInput
        icon="lock-outline"
        placeholder="Password"
        value={password}
        onChangeText={(v) => setPassword(v)}
        secureTextEntry
        containerStyle={styles.inputSpacing}
      />

      {/* Terms */}
      <Text style={styles.terms}>
        I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text>
      </Text>

      {/* Create Account */}
      <OrangeButton
        onPress={handleSignIn}
        disabled={!email || !password}
        style={styles.cta}
      >
        "Sign In"
      </OrangeButton>
    </OnboardingCard>
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
    // marginBottom: 20,
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
