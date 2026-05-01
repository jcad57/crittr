import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import type { FeedbackCategory } from "@/services/feedback";
import { submitFeedback } from "@/services/feedback";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: "general", label: "General" },
  { id: "bug", label: "Bug" },
  { id: "feature", label: "Feature idea" },
];

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert(
        "Add details",
        "Tell us what’s on your mind in the message field.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitFeedback({
        category,
        subject: subject.trim(),
        message: trimmed,
      });
      if (!result.ok) {
        Alert.alert("Couldn’t send", result.message);
        return;
      }
      if (result.skipped) {
        Alert.alert(
          "Thanks!",
          "Your feedback was accepted, but email isn’t configured on this server yet. Ask your developer to set RESEND_API_KEY and FROM_EMAIL on the submit-feedback function.",
          [{ text: "OK", onPress: () => router.back() }],
        );
        return;
      }
      Alert.alert(
        "Thanks!",
        "We received your feedback and will review it soon.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } finally {
      setSubmitting(false);
    }
  }, [category, message, subject, router]);

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
          Share feedback
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          styles.bodyGrow,
          { paddingBottom: scrollInsetBottom + 28 },
        ]}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          What would you like us to know? Your message is sent to our support
          inbox.
        </Text>

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => {
            const selected = category === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={({ pressed }) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Subject (optional)</Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="Short summary"
          placeholderTextColor={Colors.gray400}
          style={styles.input}
          maxLength={200}
          editable={!submitting}
        />

        <Text style={styles.fieldLabel}>Message</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Describe the issue or idea…"
          placeholderTextColor={Colors.gray400}
          style={[styles.input, styles.inputMultiline]}
          multiline
          textAlignVertical="top"
          maxLength={8000}
          editable={!submitting}
        />

        <View style={styles.footerSpacer} />

        <OrangeButton
          onPress={onSubmit}
          disabled={submitting}
          loading={submitting}
        >
          Send feedback
        </OrangeButton>
      </KeyboardAwareScrollView>
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
    gap: 0,
  },
  bodyGrow: {
    flexGrow: 1,
  },
  footerSpacer: {
    flex: 1,
    minHeight: 16,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.4,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  chipSelected: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    fontFamily: Font.uiMedium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  chipTextSelected: {
    color: Colors.orange,
  },
  input: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  inputMultiline: {
    minHeight: 160,
    paddingTop: 12,
  },
});
