import FaqAccordion from "@/components/support/FaqAccordion";
import { Colors } from "@/constants/colors";
import { helpCenterFaqs } from "@/constants/helpCenterFaqs";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HelpCenterScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
          Help center
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
        <Text style={styles.lead}>
          Quick answers about Crittr. Tap a question to expand.
        </Text>
        <FaqAccordion
          items={helpCenterFaqs}
          expandedId={expandedId}
          onExpandedChange={setExpandedId}
        />
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
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
});
