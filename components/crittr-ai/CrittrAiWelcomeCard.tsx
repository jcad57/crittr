import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { StyleSheet, Text, View } from "react-native";

/** Only shown before a conversation starts. Keep the welcome free of decoration. */
export default function CrittrAiWelcomeCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Big questions.{"\n"}Little questions.{"\n"}
        <Text style={styles.accent}>Ask away.</Text>
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.lavenderLight,
    borderRadius: 26,
    padding: 24,
    marginBottom: 6,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 32,
    lineHeight: 36,
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  accent: { color: Colors.lavenderDark },
});
