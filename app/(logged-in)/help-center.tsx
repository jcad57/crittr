import ScreenHeader from "@/components/ui/ScreenHeader";
import FaqAccordion from "@/components/support/FaqAccordion";
import { Colors } from "@/theme/colors";
import { HelpCenterFaq, helpCenterFaqs } from "@/content/helpCenterFaqs";
import { Font } from "@/theme/typography";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HelpCenterScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groupedFAQS = helpCenterFaqs.reduce(
    (acc, faq) => {
      if (!acc[faq.category]) {
        acc[faq.category] = [];
      }
      acc[faq.category].push(faq);
      return acc;
    },
    {} as Record<HelpCenterFaq["category"], HelpCenterFaq[]>,
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader
        title="Help center"
        onBack={() => router.back()}
      />

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
        {Object.entries(groupedFAQS).map(([category, faqs]) => (
          <View key={category} style={styles.accordionContainer}>
            <Text style={styles.faqTitle}>{category}</Text>
            <FaqAccordion
              items={faqs}
              expandedId={expandedId}
              onExpandedChange={setExpandedId}
            />
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
  faqTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingLeft: 14,
    marginBottom: 12,
  },

  accordionContainer: {
    marginBottom: 24,
  },
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
