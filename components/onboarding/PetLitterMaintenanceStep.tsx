import PetCatLitterSection from "@/components/onboarding/petInfo/PetCatLitterSection";
import { petCareStyles } from "@/components/onboarding/petCareStyles";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { ACTIVITY_TYPE_LOG_ICONS } from "@/constants/activityTypeProgressIcons";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { useOnboardingStore } from "@/stores/onboardingStore";
import type { LitterCleaningPeriod } from "@/types/database";
import {
  PET_DETAILS_STEP_INDEX,
  PET_FOOD_STEP_INDEX,
} from "@/utils/onboardingPetFlow";
import { useShallow } from "zustand/react/shallow";
import { useCallback, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function PetLitterMaintenanceStep() {
  const { profileData, setProfileData, goToStep } = useOnboardingStore(
    useShallow((s) => ({
      profileData: s.profileData,
      setProfileData: s.setProfileData,
      goToStep: s.goToStep,
    })),
  );
  const [attempted, setAttempted] = useState(false);

  const periodOk =
    profileData.litterCleaningPeriod === "day" ||
    profileData.litterCleaningPeriod === "week" ||
    profileData.litterCleaningPeriod === "month";
  const n = profileData.litterCleaningsPerPeriod.trim();
  const cleaningsOk =
    n !== "" &&
    Number.isFinite(parseInt(n, 10)) &&
    parseInt(n, 10) >= 1;

  const isValid = periodOk && cleaningsOk;

  const handleContinue = useCallback(() => {
    if (!isValid) {
      setAttempted(true);
      return;
    }
    goToStep(PET_FOOD_STEP_INDEX);
  }, [isValid, goToStep]);

  const handleBack = useCallback(() => {
    goToStep(PET_DETAILS_STEP_INDEX);
  }, [goToStep]);

  const missing = useMemo(
    () => ({
      litterCleaningPeriod: !periodOk,
      litterCleaningsPerPeriod: !cleaningsOk,
    }),
    [periodOk, cleaningsOk],
  );

  const err = (field: keyof typeof missing) => missing[field] && attempted;

  return (
    <View style={styles.root}>
      <View style={styles.form}>
        <Text style={[authOnboardingStyles.screenTitle, { marginBottom: 12 }]}>
          Litter box maintenance
        </Text>

        <View style={petCareStyles.iconCenter}>
          <Image
            source={ACTIVITY_TYPE_LOG_ICONS.maintenance}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </View>

        <Text
          style={[authOnboardingStyles.screenSubtitle, { marginBottom: 24 }]}
        >
          One schedule covers every cat in your home. Progress updates for all of
          them when you log a cleaning.
        </Text>

        <PetCatLitterSection
          litterCleaningPeriod={profileData.litterCleaningPeriod}
          litterCleaningsPerPeriod={profileData.litterCleaningsPerPeriod}
          onPeriodChange={(p: LitterCleaningPeriod) =>
            setProfileData({ litterCleaningPeriod: p })
          }
          onCleaningsChange={(v) =>
            setProfileData({ litterCleaningsPerPeriod: v })
          }
          periodError={err("litterCleaningPeriod")}
          cleaningsError={err("litterCleaningsPerPeriod")}
        />
      </View>

      <View style={styles.spacer} />

      <View style={styles.footer}>
        <OrangeButton onPress={handleContinue} style={styles.continueBtn}>
          Continue
        </OrangeButton>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={[authOnboardingStyles.backText, styles.backLabel]}>
            Back
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
  },
  form: {
    width: "100%",
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  footer: {
    width: "100%",
    alignItems: "center",
  },
  continueBtn: {
    alignSelf: "stretch",
    marginTop: 8,
  },
  backButton: {
    alignSelf: "center",
    paddingVertical: 16,
  },
  backLabel: {
    textAlign: "center",
  },
});
