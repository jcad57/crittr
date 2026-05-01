import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import FormInput from "@/components/onboarding/FormInput";
import PetEnergyLevelToggle from "@/components/onboarding/petInfo/PetEnergyLevelToggle";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { shouldShowExerciseField } from "@/constants/petInfo";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  usePetDetailsQuery,
  useUpdatePetExerciseRequirementsMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import type { PetFormData } from "@/types/database";
import { getErrorMessage } from "@/utils/errorMessage";
import { formatEnergyLabel } from "@/utils/petDisplay";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ExerciseRequirementsScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const scrollContentMinHeight = useMemo(() => {
    const topChrome = insets.top + 8 + 56 + 8 + 4;
    return Math.max(windowHeight - topChrome - insets.bottom, 240);
  }, [insets.top, insets.bottom, windowHeight]);

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);
  const canEditProfile = useCanPerformAction(petId, "can_edit_pet_profile");
  const updateMut = useUpdatePetExerciseRequirementsMutation(petId ?? "");

  const [energyLevel, setEnergyLevel] = useState<PetFormData["energyLevel"]>(
    "",
  );
  const [exercisesPerDay, setExercisesPerDay] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!details?.id) return;
    setEnergyLevel(
      details.energy_level === "low" ||
        details.energy_level === "medium" ||
        details.energy_level === "high"
        ? details.energy_level
        : "",
    );
    const n = details.exercises_per_day;
    setExercisesPerDay(n != null && n > 0 ? String(n) : "");
  }, [details?.id]);

  const showExercise = details
    ? shouldShowExerciseField(details.pet_type ?? "")
    : false;

  const handleSave = useCallback(async () => {
    if (!details || !petId) return;
    setAttempted(true);
    if (
      energyLevel !== "low" &&
      energyLevel !== "medium" &&
      energyLevel !== "high"
    ) {
      return;
    }
    let exercisesPayload: number | null = details.exercises_per_day ?? null;
    if (showExercise) {
      const n = parseInt(exercisesPerDay.trim().replace(",", "."), 10);
      if (!Number.isFinite(n) || n < 1) return;
      exercisesPayload = n;
    }

    try {
      await updateMut.mutateAsync({
        energy_level: energyLevel,
        exercises_per_day: exercisesPayload,
      });
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save", getErrorMessage(e) || "Please try again.");
    }
  }, [
    details,
    petId,
    energyLevel,
    exercisesPerDay,
    showExercise,
    updateMut,
    router,
  ]);

  const energyError =
    attempted &&
    energyLevel !== "low" &&
    energyLevel !== "medium" &&
    energyLevel !== "high";
  const exercisesError =
    attempted &&
    showExercise &&
    (!exercisesPerDay.trim() ||
      !Number.isFinite(
        parseInt(exercisesPerDay.trim().replace(",", "."), 10),
      ) ||
      parseInt(exercisesPerDay.trim().replace(",", "."), 10) < 1);

  if (isLoading || !details || !petId) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canEditProfile === undefined) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canEditProfile === false) {
    const showEx = shouldShowExerciseField(details.pet_type ?? "");
    const activitiesLabel =
      details.exercises_per_day != null && details.exercises_per_day > 0
        ? String(details.exercises_per_day)
        : showEx
          ? "—"
          : "Not tracked for this species";
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </TouchableOpacity>
          <Text
            style={styles.navTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            Exercise requirements
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: scrollInsetBottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CoCareReadOnlyNotice />
          <ReadOnlyFieldRow
            label="Energy level"
            value={formatEnergyLabel(details.energy_level)}
          />
          <ReadOnlyFieldRow
            label="Target activities per day"
            value={activitiesLabel}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.navBack}>&lt; Back</Text>
        </TouchableOpacity>
        <Text
          style={styles.navTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
        >
          Exercise requirements
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          styles.scrollContentGrow,
          { paddingBottom: scrollInsetBottom + 32 },
        ]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.scrollInner, { minHeight: scrollContentMinHeight }]}
        >
          <View>
            <Text style={styles.lead}>
              Energy and activity targets are part of your pet&apos;s baseline
              care. You can update them anytime; they power daily progress on
              the home screen.
            </Text>

            <PetEnergyLevelToggle
              energyLevel={energyLevel}
              onChange={(level) => setEnergyLevel(level)}
              error={energyError}
            />

            {showExercise ? (
              <FormInput
                label="Target activities per day"
                required
                placeholder="Walks, dog park, playtime, etc."
                value={exercisesPerDay}
                onChangeText={setExercisesPerDay}
                keyboardType="number-pad"
                containerStyle={styles.field}
                error={exercisesError}
              />
            ) : (
              <Text style={styles.helperMuted}>
                Activity count applies to dogs and similar companions. It
                isn&apos;t tracked for this species; the value stays as stored.
              </Text>
            )}
          </View>

          <View style={styles.actionsBlock}>
            <OrangeButton
              onPress={handleSave}
              loading={updateMut.isPending}
              style={styles.saveBtn}
            >
              Save
            </OrangeButton>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
    minWidth: 72,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  navSpacer: { minWidth: 72 },
  scroll: { flex: 1 },
  scrollContentGrow: {
    flexGrow: 1,
  },
  scrollInner: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  actionsBlock: {
    paddingTop: 8,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  field: {
    marginBottom: 8,
  },
  helperMuted: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  saveBtn: {
    marginTop: 0,
  },
});
