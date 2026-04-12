import { Colors } from "@/constants/colors";
import { privacyPolicySections } from "@/constants/privacyPolicyContent";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          Privacy policy
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: scrollInsetBottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.notice}>
          <MaterialCommunityIcons
            name="information-outline"
            size={20}
            color={Colors.orange}
          />
          <Text style={styles.noticeText}>
            This is a placeholder policy for layout and product iteration. Update
            before production.
          </Text>
        </View>

        {privacyPolicySections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  navSpacer: { width: 28 },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.orangeLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  noticeText: {
    flex: 1,
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 17,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  paragraph: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 23,
    marginBottom: 10,
  },
});
