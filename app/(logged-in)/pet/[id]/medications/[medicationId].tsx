import MedicationDosageEditorModal from "@/components/pet/MedicationDosageEditorModal";
import PetMedicationDosageScheduleSection from "@/components/petScreens/medication/PetMedicationDosageScheduleSection";
import PetMedicationFormActions from "@/components/petScreens/medication/PetMedicationFormActions";
import PetMedicationFrequencySection from "@/components/petScreens/medication/PetMedicationFrequencySection";
import PetMedicationLastGivenSection from "@/components/petScreens/medication/PetMedicationLastGivenSection";
import PetMedicationNavHeader from "@/components/petScreens/medication/PetMedicationNavHeader";
import PetMedicationNoPermissionAddView from "@/components/petScreens/medication/PetMedicationNoPermissionAddView";
import PetMedicationNotesSection from "@/components/petScreens/medication/PetMedicationNotesSection";
import PetMedicationReadOnlyView from "@/components/petScreens/medication/PetMedicationReadOnlyView";
import FormInput from "@/components/ui/form/FormInput";
import {
  useInsertMedicationMutation,
  usePetDetailsQuery,
  useUpdateMedicationMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { usePetScopedAfterSwitchPet } from "@/hooks/usePetScopedAfterSwitchPet";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { styles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";
import { Colors } from "@/theme/colors";
import { getErrorMessage } from "@/utils/errorMessage";
import {
  isMedicationDosagesValid,
  type MedicationDosageDraft,
} from "@/utils/medicationDosageDraft";
import { createMedicationDosageHandlers } from "@/utils/medicationDosageEditor";
import { buildMedicationSavePayload } from "@/utils/medicationEditForm";
import { hydrateFromMed } from "@/utils/medicationEditHydration";
import {
  DEFAULT_FREQUENCY_DRAFT,
  dosageScheduleHint,
  lastGivenHelperText,
  type MedicationFrequencyDraft,
} from "@/utils/medicationFrequency";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditPetMedicationScreen() {
  const insets = useSafeAreaInsets();
  const { replace, router } = useNavigationCooldown();
  const { id: rawPetId, medicationId: rawMedId } = useLocalSearchParams<{
    id: string;
    medicationId: string;
  }>();
  const petId = Array.isArray(rawPetId) ? rawPetId[0] : rawPetId;
  const medicationId = Array.isArray(rawMedId) ? rawMedId[0] : rawMedId;
  const isNew = medicationId === "new";

  const onPetSwitch = usePetScopedAfterSwitchPet(petId, replace);

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
  const { isPro, isProfileReady, replaceWithUpgrade } = useProGateNavigation();

  const [name, setName] = useState("");
  const [dosages, setDosages] = useState<MedicationDosageDraft[]>([]);
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [lastGivenOn, setLastGivenOn] = useState("");
  const [frequency, setFrequency] = useState<MedicationFrequencyDraft>(
    DEFAULT_FREQUENCY_DRAFT,
  );
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [editingName, setEditingName] = useState(isNew);
  const lastGivenMaxDateRef = useRef(new Date());

  const [dosageModalVisible, setDosageModalVisible] = useState(false);
  const [dosageModalTitle, setDosageModalTitle] = useState("Add dosage");
  const [dosageEditorDraft, setDosageEditorDraft] =
    useState<MedicationDosageDraft | null>(null);
  const [editingDosageIndex, setEditingDosageIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (isNew || !med) return;
    const h = hydrateFromMed(med);
    setName(h.name);
    setDosages(h.dosages);
    setCondition(h.condition);
    setNotes(h.notes);
    setLastGivenOn(h.lastGivenOn);
    setFrequency(h.frequency);
  }, [isNew, med]);

  const { openAddDosage, openEditDosage, removeDosage, saveDosageFromModal } =
    createMedicationDosageHandlers({
      dosages,
      setDosages,
      editingDosageIndex,
      setEditingDosageIndex,
      setDosageEditorDraft,
      setDosageModalVisible,
      setDosageModalTitle,
    });

  const handleSave = useCallback(async () => {
    if (!petId || !medicationId) return;
    if (!isNew && !med) return;
    setValidationAttempted(true);
    if (!name.trim()) {
      return;
    }
    if (!isMedicationDosagesValid(dosages)) {
      return;
    }

    const payload = buildMedicationSavePayload({
      name,
      dosages,
      condition,
      notes,
      lastGivenOn,
      frequency,
      createdAt: med?.created_at,
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
    dosages,
    condition,
    notes,
    lastGivenOn,
    frequency,
    insertMut,
    updateMut,
    router,
  ]);

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
        onAfterSwitchPet={onPetSwitch}
      />
    );
  }

  const saving = isNew ? insertMut.isPending : updateMut.isPending;

  const nameError = validationAttempted && !name.trim();
  const needsFirstDosage = validationAttempted && dosages.length < 1;
  const dosageAmountMissing =
    validationAttempted &&
    dosages.length > 0 &&
    dosages.some((d) => !d.dosageAmount.trim() || !d.dosageType.trim());
  const scheduleLabelError = dosageAmountMissing && !needsFirstDosage;

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
        onAfterSwitchPet={onPetSwitch}
      />

      <View style={styles.scrollSafe}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
          bottomOffset={20}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <View style={styles.nameBlock}>
              {isNew || editingName ? (
                <FormInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Medication name"
                  error={nameError}
                  errorMessage={
                    nameError ? "Enter a medication name." : undefined
                  }
                  autoFocus={!isNew}
                  onBlur={() => {
                    if (!isNew && name.trim()) setEditingName(false);
                  }}
                  containerStyle={styles.field}
                />
              ) : (
                <View style={styles.medicationNameWrap}>
                  <Text style={styles.medicationName}>{name}</Text>
                  <Pressable
                    onPress={() => setEditingName(true)}
                    style={styles.editNameBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Edit name"
                  >
                    <MaterialCommunityIcons
                      name="pencil"
                      size={18}
                      color={Colors.orange}
                    />
                    <Text style={styles.editNameText}>Edit name</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <PetMedicationFrequencySection
              draft={frequency}
              onChange={setFrequency}
              lastGivenOn={lastGivenOn}
            />

            <PetMedicationDosageScheduleSection
              dosages={dosages}
              onAddDosage={openAddDosage}
              onEditDosage={openEditDosage}
              onRemoveDosage={removeDosage}
              scheduleLabelError={scheduleLabelError}
              addDosageButtonError={needsFirstDosage}
              hint={dosageScheduleHint(frequency.kind)}
              dosageRowAmountMissing={(idx) =>
                validationAttempted &&
                (!dosages[idx]?.dosageAmount.trim() ||
                  !dosages[idx]?.dosageType.trim())
              }
            />

            <PetMedicationLastGivenSection
              value={lastGivenOn}
              onChangeDate={setLastGivenOn}
              onClearDate={() => setLastGivenOn("")}
              helperText={lastGivenHelperText(
                frequency.kind,
                lastGivenOn.trim().length > 0,
              )}
              maximumDate={lastGivenMaxDateRef.current}
            />

            <PetMedicationNotesSection
              petName={details?.name ?? "your pet"}
              value={notes}
              onChangeText={setNotes}
            />

            <PetMedicationFormActions
              isNew={isNew}
              saving={saving}
              showErrorHint={
                validationAttempted &&
                (nameError || needsFirstDosage || dosageAmountMissing)
              }
              onSave={handleSave}
              onCancel={() => router.back()}
            />
          </View>
        </KeyboardAwareScrollView>
      </View>

      <MedicationDosageEditorModal
        visible={dosageModalVisible}
        title={dosageModalTitle}
        initial={dosageEditorDraft}
        onClose={() => {
          setDosageModalVisible(false);
          setEditingDosageIndex(null);
          setDosageEditorDraft(null);
        }}
        onSave={saveDosageFromModal}
      />
    </View>
  );
}
