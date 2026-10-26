import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/theme/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/theme/typography";
import { PRO_ONBOARDING_COPY } from "@/constants/proCopy";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type ProOnboardingStep = "welcome" | "cocare" | "expand" | "done";
export type ProOnboardingExpandKind =
  | "addPet"
  | "records"
  | "medications"
  | "crittrAi";

type Props = {
  step: ProOnboardingStep;
  expandKind: ProOnboardingExpandKind | null;
  petName: string | null;
  onWelcomeContinue: () => void;
  welcomeBusy?: boolean;
  onCocare: () => void;
  onCocareSkip: () => void;
  onExpand: () => void;
  onExpandSkip: () => void;
  onDone: () => void;
};

export function ProOnboardingView({
  step,
  expandKind,
  petName,
  onWelcomeContinue,
  welcomeBusy,
  onCocare,
  onCocareSkip,
  onExpand,
  onExpandSkip,
  onDone,
}: Props) {
  if (step === "welcome") {
    return (
      <View style={styles.body}>
        <Text style={styles.title}>{PRO_ONBOARDING_COPY.welcomeTitle}</Text>
        <Text style={styles.lead}>{PRO_ONBOARDING_COPY.welcomeLead}</Text>
        <OrangeButton
          onPress={onWelcomeContinue}
          style={styles.cta}
          disabled={welcomeBusy}
          loading={welcomeBusy}
        >
          {PRO_ONBOARDING_COPY.welcomeCta}
        </OrangeButton>
      </View>
    );
  }

  if (step === "cocare") {
    return (
      <View style={styles.body}>
        <Text style={styles.title}>{PRO_ONBOARDING_COPY.cocareTitle}</Text>
        <Text style={styles.lead}>{PRO_ONBOARDING_COPY.cocareLead}</Text>
        <OrangeButton onPress={onCocare} style={styles.cta}>
          {PRO_ONBOARDING_COPY.cocareCta}
        </OrangeButton>
        <Pressable
          onPress={onCocareSkip}
          style={({ pressed }) => [
            styles.skip,
            pressed && styles.skipPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={PRO_ONBOARDING_COPY.cocareSkip}
        >
          <Text style={styles.skipText}>{PRO_ONBOARDING_COPY.cocareSkip}</Text>
        </Pressable>
      </View>
    );
  }

  if (step === "expand" && expandKind) {
    const copy = PRO_ONBOARDING_COPY.expand[expandKind];
    return (
      <View style={styles.body}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.lead}>{copy.lead}</Text>
        <OrangeButton onPress={onExpand} style={styles.cta}>
          {copy.cta}
        </OrangeButton>
        <Pressable
          onPress={onExpandSkip}
          style={({ pressed }) => [
            styles.skip,
            pressed && styles.skipPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={PRO_ONBOARDING_COPY.expandSkip}
        >
          <Text style={styles.skipText}>{PRO_ONBOARDING_COPY.expandSkip}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Text style={styles.title}>{PRO_ONBOARDING_COPY.doneTitle}</Text>
      <Text style={styles.lead}>{PRO_ONBOARDING_COPY.doneLead(petName)}</Text>
      <OrangeButton onPress={onDone} style={styles.cta}>
        {PRO_ONBOARDING_COPY.doneCta}
      </OrangeButton>
    </View>
  );
}

export const proOnboardingStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  body: {
    width: "100%",
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 17,
    lineHeight: 26,
    color: Colors.textSecondary,
    marginBottom: 28,
  },
  cta: {
    alignSelf: "stretch",
  },
  skip: {
    alignSelf: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  skipPressed: {
    opacity: 0.7,
  },
  skipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});

const styles = proOnboardingStyles;
