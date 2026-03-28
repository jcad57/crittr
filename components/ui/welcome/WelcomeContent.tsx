import { Colors } from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import OrangeButton from "../buttons/OrangeButton";
import ScreenWrapper from "../ScreenWrapper";

export default function WelcomeContent() {
  const router = useRouter();

  return (
    <>
      <LinearGradient
        colors={["#FDB97E", "#F4845F", "#F27059"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      />
      <ScreenWrapper>
        <View style={styles.container}>
          <Text style={styles.headline}>Co-care for your best friend</Text>
          <Text style={styles.subheadline}>
            Crittr is a platform that helps you track your pet's health and
            activities.
          </Text>
          <OrangeButton
            style={styles.ctaButton}
            onPress={() => router.push("/(auth)/(onboarding)")}
          >
            Create Account
          </OrangeButton>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable style={styles.signInRow}>
              <Text style={styles.signInLink}>I already have an account! </Text>
              <Text style={styles.signInLinkBold}>Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 8,
    paddingBottom: 32,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  headline: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 32,
    textAlign: "center",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subheadline: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 18,
    textAlign: "center",
    color: Colors.textSecondary,
    marginBottom: 40,
  },
  ctaButton: {
    marginBottom: 22,
  },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  signInLink: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  signInLinkBold: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
  },
});
