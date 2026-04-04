import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Aligned with `Context Files/CrittrPro.md` — Pro tier features. */
const PRO_FEATURES: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  subtitle: string;
}[] = [
  {
    icon: "robot-outline",
    title: "CrittrAI",
    subtitle: "Smart help for pet care questions and tips.",
  },
  {
    icon: "paw",
    title: "Unlimited pets",
    subtitle: "Add every companion without limits.",
  },
  {
    icon: "account-group-outline",
    title: "Co-care",
    subtitle: "Invite family or sitters to share care.",
  },
  {
    icon: "file-document-outline",
    title: "Upload pet records",
    subtitle: "Store documents and files per pet.",
  },
  {
    icon: "food-outline",
    title: "Unlimited meals, treats & meds",
    subtitle: "Log as many foods and medications as you need.",
  },
  {
    icon: "bell-ring-outline",
    title: "Notifications & reminders",
    subtitle: "Stay on schedule with alerts that matter.",
  },
];

export default function WelcomeToProScreen() {
  const insets = useSafeAreaInsets();
  const { replace } = useNavigationCooldown();

  const goHome = () => {
    replace("/(logged-in)/dashboard" as Href);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Welcome to Crittr Pro!</Text>
        <Text style={styles.lead}>
          Your trial is active. Here is everything you can use right now.
        </Text>

        <View style={styles.card}>
          {PRO_FEATURES.map((row, i) => (
            <View
              key={row.title}
              style={[
                styles.row,
                i < PRO_FEATURES.length - 1 && styles.rowBorder,
              ]}
            >
              <View style={styles.rowIcon}>
                <MaterialCommunityIcons
                  name={row.icon}
                  size={22}
                  color={Colors.orange}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSub}>{row.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>
          Cancel anytime before your trial ends. Manage billing from your
          account profile when billing is connected.
        </Text>

        <OrangeButton onPress={goHome} style={styles.cta}>
          Go to home
        </OrangeButton>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
    marginBottom: 20,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.amberLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  rowSub: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  footnote: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.gray500,
    textAlign: "center",
    marginBottom: 20,
  },
  cta: {
    alignSelf: "stretch",
  },
});
