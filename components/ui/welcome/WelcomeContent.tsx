import { Colors } from "@/constants/colors";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import OrangeButton from "../buttons/OrangeButton";

export default function WelcomeContent() {
  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Co-care for your best friend</Text>
      <Text style={styles.subheadline}>
        Crittr is a platform that helps you track your pet's health and
        activities.
      </Text>
      <OrangeButton>Create Account</OrangeButton>
      <Link href="/(auth)/sign-in" asChild>
        <Text style={styles.signInLink}>
          I already have an account!{" "}
          <Text style={styles.signInLinkBold}>Sign In</Text>
        </Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
    width: "100%",
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  headline: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 32,
    textAlign: "center",
    color: Colors.textPrimary,
  },
  subheadline: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 18,
    textAlign: "center",
    color: Colors.textSecondary,
  },
  signInLink: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 16,
    textAlign: "center",
    color: Colors.textPrimary,
  },
  signInLinkBold: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
  },
});
