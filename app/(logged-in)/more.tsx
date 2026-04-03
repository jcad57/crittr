import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { push } = useNavigationCooldown();
  const { runWithProOrUpgrade } = useProGateNavigation();

  const openCrittrAi = () => {
    runWithProOrUpgrade(() => {
      push("/(logged-in)/crittr-ai" as Href);
    });
  };

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + 8,
        },
      ]}
    >
      <Text style={styles.title}>More</Text>
      <Text style={styles.subtitle}>
        Pro features, your profile, and other tools.
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: scrollInsetBottom + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Pro & tools</Text>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={openCrittrAi}
        >
          <View style={[styles.rowIcon, styles.rowIconAi]}>
            <MaterialCommunityIcons
              name="robot-outline"
              size={24}
              color={Colors.orange}
            />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>CrittrAI</Text>
            <Text style={styles.rowSub}>
              Ask questions about your pets&apos; care and routines
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={Colors.gray400}
          />
        </Pressable>

        <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Account</Text>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => push("/(logged-in)/profile" as Href)}
        >
          <View style={[styles.rowIcon, styles.rowIconProfile]}>
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={24}
              color={Colors.skyDark}
            />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Profile</Text>
            <Text style={styles.rowSub}>Photo, bio, and membership</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={Colors.gray400}
          />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  scroll: { flex: 1 },
  scrollInner: {
    paddingTop: 4,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  sectionSpaced: {
    marginTop: 22,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  rowPressed: { opacity: 0.92 },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconAi: {
    backgroundColor: Colors.orangeLight,
  },
  rowIconProfile: {
    backgroundColor: Colors.skyLight,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  rowSub: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
