import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { Pressable, StyleSheet, Text, View } from "react-native";

type OptInStepProps = {
  title: string;
  subtitle?: string;
  yesLabel?: string;
  noLabel?: string;
  onYes: () => void;
  onNo: () => void;
  onBack: () => void;
};

export default function OptInStep({
  title,
  subtitle,
  yesLabel = "Yes",
  noLabel = "Not now",
  onYes,
  onNo,
  onBack,
}: OptInStepProps) {
  return (
    <View style={styles.container}>
      <View style={styles.centerBlock}>
        <Text style={[authOnboardingStyles.screenTitle, styles.title]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[authOnboardingStyles.screenSubtitle, styles.subtitle]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <OrangeButton onPress={onYes} style={styles.primary}>
          {yesLabel}
        </OrangeButton>

        <Pressable style={styles.secondary} onPress={onNo}>
          <Text style={styles.secondaryText}>{noLabel}</Text>
        </Pressable>

        <Pressable onPress={onBack} style={styles.backWrap}>
          <Text style={authOnboardingStyles.backText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    minHeight: 280,
  },
  /** Vertically centers title + subtitle in the space above the action buttons. */
  centerBlock: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 8,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 0,
  },
  actions: {
    width: "100%",
    flexShrink: 0,
    paddingTop: 8,
  },
  primary: {
    marginBottom: 12,
  },
  secondary: {
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.gray300,
    backgroundColor: Colors.white,
  },
  secondaryText: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  backWrap: {
    alignSelf: "center",
    paddingVertical: 16,
  },
});
