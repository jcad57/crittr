import ExpiryDateField from "@/components/onboarding/ExpiryDateField";
import FormInput from "@/components/onboarding/FormInput";
import PetMedicationDosageRow from "@/components/petScreens/medication/PetMedicationDosageRow";
import PetMedicationFormActions from "@/components/petScreens/medication/PetMedicationFormActions";
import PetMedicationFrequencySection from "@/components/petScreens/medication/PetMedicationFrequencySection";
import PetMedicationNavHeader from "@/components/petScreens/medication/PetMedicationNavHeader";
import PetMedicationNoPermissionAddView from "@/components/petScreens/medication/PetMedicationNoPermissionAddView";
import PetMedicationReadOnlyView from "@/components/petScreens/medication/PetMedicationReadOnlyView";
import PetMedicationReminderField from "@/components/petScreens/medication/PetMedicationReminderField";
import { Colors } from "@/constants/colors";
import { type SchedulePeriod } from "@/constants/medicationEditForm";
import {
  useDeleteMedicationMutation,
  useInsertMedicationMutation,
  usePetDetailsQuery,
  useUpdateMedicationMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import type { MedicationDosePeriod } from "@/types/database";
import { getErrorMessage } from "@/utils/errorMessage";
import { buildMedicationSavePayload } from "@/utils/medicationEditForm";
import { hydrateFromMed } from "@/utils/medicationEditHydration";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { styles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";

export default function EditPetMedicationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: rawPetId, medicationId: rawMedId } = useLocalSearchParams<{
    id: string;
    medicationId: string;
  }>();
  const petId = Array.isArray(rawPetId) ? rawPetId[0] : rawPetId;
  const medicationId = Array.isArray(rawMedId) ? rawMedId[0] : rawMedId;
  const isNew = medicationId === "new";

  const { data: details, isLoading } = usePetDetailsQuery(petId);
  const canManageMedications = useCanPerformAction(
    petId,
    "can_manage_medications",
  );
  const med = useMemo(
    () =>
      !isNew && medicationId
        ? details?.medications.find((x) => x.id === medicationId)
        : undefined,
    [details?.medications, medicationId, isNew],
  );

  const insertMut = useInsertMedicationMutation(petId ?? "");
  const updateMut = useUpdateMedicationMutation(petId ?? "");
  const deleteMut = useDeleteMedicationMutation(petId ?? "");
  const { isPro, isProfileReady, replaceWithUpgrade } = useProGateNavigation();

  const [name, setName] = useState("");
  const [dosageAmount, setDosageAmount] = useState("");
  const [dosageType, setDosageType] = useState("");
  const [dosesPerPeriod, setDosesPerPeriod] = useState("1");
  const [schedulePeriod, setSchedulePeriod] = useState<SchedulePeriod>("day");
  const [customIntervalCount, setCustomIntervalCount] = useState("1");
  const [customIntervalUnit, setCustomIntervalUnit] =
    useState<MedicationDosePeriod>("month");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderDates, setReminderDates] = useState<Date[]>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return [d];
  });
  const [lastGivenOn, setLastGivenOn] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);

  useEffect(() => {
    if (isNew || !med) return;
    const h = hydrateFromMed(med);
    setName(h.name);
    setDosageAmount(h.dosageAmount);
    setDosageType(h.dosageType);
    setDosesPerPeriod(h.dosesPerPeriod);
    setSchedulePeriod(h.schedulePeriod);
    setCustomIntervalCount(h.customIntervalCount);
    setCustomIntervalUnit(h.customIntervalUnit);
    setCondition(h.condition);
    setNotes(h.notes);
    setReminderDates(h.reminderDates);
    setLastGivenOn(h.lastGivenOn);
  }, [isNew, med]);

  const handleSave = useCallback(async () => {
    if (!petId || !medicationId) return;
    if (!isNew && !med) return;
    setValidationAttempted(true);
    if (!name.trim()) {
      return;
    }

    const payload = buildMedicationSavePayload({
      name,
      dosageAmount,
      dosageType,
      dosesPerPeriod,
      schedulePeriod,
      customIntervalCount,
      customIntervalUnit,
      condition,
      notes,
      reminderDates,
      lastGivenOn,
    });
    if (!payload) return;

    try {
      if (isNew) {
        await insertMut.mutateAsync(payload);
      } else {
        await updateMut.mutateAsync({
          medicationId,
          updates: payload,
        });
      }
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save", getErrorMessage(e));
    }
  }, [
    petId,
    medicationId,
    isNew,
    med,
    name,
    dosageAmount,
    dosageType,
    dosesPerPeriod,
    schedulePeriod,
    customIntervalCount,
    customIntervalUnit,
    condition,
    notes,
    reminderDates,
    lastGivenOn,
    insertMut,
    updateMut,
    router,
  ]);

  const handleDelete = useCallback(() => {
    if (!petId || !medicationId || isNew) return;
    Alert.alert(
      "Delete medication",
      "This removes it from your pet’s profile. Activity history for past doses may still reference it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMut.mutateAsync(medicationId);
              router.back();
            } catch (e) {
              Alert.alert("Couldn't delete", getErrorMessage(e));
            }
          },
        },
      ],
    );
  }, [petId, medicationId, isNew, deleteMut, router]);

  useLayoutEffect(() => {
    if (!isNew || !details) return;
    if (canManageMedications !== true) return;
    if (!isProfileReady) return;
    if ((details.medications?.length ?? 0) >= 1 && !isPro) {
      replaceWithUpgrade();
    }
  }, [
    isNew,
    details,
    isPro,
    isProfileReady,
    replaceWithUpgrade,
    canManageMedications,
  ]);

  if (isLoading && !details) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!details && !isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.missing}>Pet not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!isNew && !isLoading && !med) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.missing}>Medication not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (details && canManageMedications === undefined) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (isNew && canManageMedications === false) {
    return (
      <PetMedicationNoPermissionAddView
        topInset={insets.top}
        onBack={() => router.back()}
      />
    );
  }

  if (!isNew && med && canManageMedications === false && details) {
    return (
      <PetMedicationReadOnlyView
        med={med}
        details={details}
        topInset={insets.top}
        onBack={() => router.back()}
      />
    );
  }

  const saving = isNew ? insertMut.isPending : updateMut.isPending;
  const deleting = deleteMut.isPending;

  const parsedDoses = parseInt(dosesPerPeriod.trim(), 10);
  const parsedCustomInterval = parseInt(customIntervalCount.trim(), 10);
  const nameError = validationAttempted && !name.trim();
  const dosePeriodStd =
    schedulePeriod === "custom"
      ? null
      : (schedulePeriod as MedicationDosePeriod);
  const doseCountError =
    validationAttempted &&
    dosePeriodStd === "day" &&
    (!Number.isFinite(parsedDoses) || parsedDoses < 1);
  const doseCountErrorWeekMonth =
    validationAttempted &&
    (dosePeriodStd === "week" || dosePeriodStd === "month") &&
    dosesPerPeriod.trim() !== "" &&
    (!Number.isFinite(parsedDoses) || parsedDoses < 1);
  const customIntervalError =
    validationAttempted &&
    schedulePeriod === "custom" &&
    (!Number.isFinite(parsedCustomInterval) || parsedCustomInterval < 1);

  const medNavTitle = isNew ? `Add medication` : `Edit medication`;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <PetMedicationNavHeader
        title={medNavTitle}
        onBack={() => router.back()}
        displayPet={details}
        accessibilityLabelPrefix={
          isNew ? "Adding medication for" : "Editing medication for"
        }
      />

      <SafeAreaView style={styles.scrollSafe} edges={["bottom"]}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
          bottomOffset={20}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <FormInput
              label="Name"
              value={name}
              onChangeText={setName}
              containerStyle={styles.field}
            />

            <PetMedicationDosageRow
              dosageAmount={dosageAmount}
              setDosageAmount={setDosageAmount}
              dosageType={dosageType}
              setDosageType={setDosageType}
            />

            <PetMedicationFrequencySection
              schedulePeriod={schedulePeriod}
              setSchedulePeriod={setSchedulePeriod}
              dosesPerPeriod={dosesPerPeriod}
              setDosesPerPeriod={setDosesPerPeriod}
              customIntervalCount={customIntervalCount}
              setCustomIntervalCount={setCustomIntervalCount}
              customIntervalUnit={customIntervalUnit}
              setCustomIntervalUnit={setCustomIntervalUnit}
              parsedCustomInterval={parsedCustomInterval}
              doseCountError={doseCountError}
              doseCountErrorWeekMonth={doseCountErrorWeekMonth}
              customIntervalError={customIntervalError}
            />

            <PetMedicationReminderField
              reminderDates={reminderDates}
              setReminderDates={setReminderDates}
            />

            <Text style={styles.fieldLabel}>Last given</Text>
            <View style={styles.lastGivenWrap}>
              <ExpiryDateField
                value={lastGivenOn}
                onChangeDate={setLastGivenOn}
                onClearDate={() => setLastGivenOn("")}
                placeholder="Select date"
              />
            </View>

            <FormInput
              label="Condition"
              value={condition}
              onChangeText={setCondition}
              containerStyle={styles.field}
            />

            <FormInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              containerStyle={styles.field}
            />

            <PetMedicationFormActions
              isNew={isNew}
              saving={saving}
              deleting={deleting}
              showErrorHint={
                validationAttempted &&
                (nameError ||
                  doseCountError ||
                  doseCountErrorWeekMonth ||
                  customIntervalError)
              }
              onSave={handleSave}
              onDelete={handleDelete}
            />
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}
