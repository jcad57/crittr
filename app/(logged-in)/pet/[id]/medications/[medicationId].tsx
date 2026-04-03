import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import DropdownSelect from "@/components/onboarding/DropdownSelect";
import ExpiryDateField from "@/components/onboarding/ExpiryDateField";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import ReminderTimePickerSheet from "@/components/ui/ReminderTimePickerSheet";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useDeleteMedicationMutation,
  useInsertMedicationMutation,
  usePetDetailsQuery,
  useUpdateMedicationMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { getErrorMessage } from "@/lib/errorMessage";
import {
  buildMedicationFrequencyLabelForDb,
  formatMedicationEveryIntervalLabel,
  formatReminderTimeHHmm,
  parseReminderTimeHHmm,
} from "@/lib/medicationSchedule";
import type { MedicationDosePeriod, PetMedication } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const DOSAGE_TYPES = [
  "Tablet",
  "Injection",
  "Liquid",
  "Topical",
  "Chewable",
  "Other",
];

type SchedulePeriod = MedicationDosePeriod | "custom";

const SCHEDULE_PERIOD_OPTIONS: { label: string; value: SchedulePeriod }[] = [
  { label: "Per day", value: "day" },
  { label: "Per week", value: "week" },
  { label: "Per month", value: "month" },
  { label: "Custom", value: "custom" },
];

const INTERVAL_UNIT_OPTIONS: { label: string; value: MedicationDosePeriod }[] =
  [
    { label: "days", value: "day" },
    { label: "weeks", value: "week" },
    { label: "months", value: "month" },
  ];

function lastGivenOnFromDb(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  return raw.trim().split("T")[0].slice(0, 10);
}

function splitDosage(dosage: string | null): { amount: string; type: string } {
  if (!dosage?.trim()) return { amount: "", type: "" };
  const parts = dosage.trim().split(/\s+/);
  if (parts.length === 1) return { amount: parts[0], type: "" };
  const [first, ...rest] = parts;
  const joined = rest.join(" ");
  if (DOSAGE_TYPES.includes(joined)) return { amount: first, type: joined };
  return { amount: dosage.trim(), type: "" };
}

function hydrateFromMed(m: PetMedication) {
  const { amount, type } = splitDosage(m.dosage);
  const period = m.dose_period ?? null;
  const ic = m.interval_count;
  const iu = m.interval_unit ?? null;
  const isCustomInterval =
    ic != null &&
    ic > 0 &&
    iu != null &&
    (iu === "day" || iu === "week" || iu === "month");

  if (isCustomInterval) {
    return {
      name: m.name,
      dosageAmount: amount,
      dosageType: type,
      dosesPerPeriod: "1",
      schedulePeriod: "custom" as SchedulePeriod,
      customIntervalCount: String(ic),
      customIntervalUnit: iu,
      condition: m.condition?.trim() ?? "",
      notes: m.notes?.trim() ?? "",
      reminderDate: parseReminderTimeHHmm(m.reminder_time ?? null),
      lastGivenOn: lastGivenOnFromDb(m.last_given_on),
    };
  }

  return {
    name: m.name,
    dosageAmount: amount,
    dosageType: type,
    dosesPerPeriod:
      m.doses_per_period != null ? String(m.doses_per_period) : "1",
    schedulePeriod: (period ?? "day") as SchedulePeriod,
    customIntervalCount: "1",
    customIntervalUnit: "month" as MedicationDosePeriod,
    condition: m.condition?.trim() ?? "",
    notes: m.notes?.trim() ?? "",
    reminderDate: parseReminderTimeHHmm(m.reminder_time ?? null),
    lastGivenOn: lastGivenOnFromDb(m.last_given_on),
  };
}

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
  const { isPro, replaceWithUpgrade } = useProGateNavigation();

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
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
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
    setReminderDate(h.reminderDate);
    setLastGivenOn(h.lastGivenOn);
  }, [isNew, med]);

  const handleSave = useCallback(async () => {
    if (!petId || !medicationId) return;
    if (!isNew && !med) return;
    setValidationAttempted(true);
    if (!name.trim()) {
      return;
    }

    const dosageStr =
      [dosageAmount.trim(), dosageType.trim()].filter(Boolean).join(" ") ||
      null;

    if (schedulePeriod === "custom") {
      const n = customIntervalCount.trim();
      const parsedInterval = parseInt(n, 10);
      if (!Number.isFinite(parsedInterval) || parsedInterval < 1) {
        return;
      }

      const freq = buildMedicationFrequencyLabelForDb(null, null, null, {
        count: parsedInterval,
        unit: customIntervalUnit,
      });

      const payload = {
        name: name.trim(),
        dosage: dosageStr,
        frequency: freq,
        condition: condition.trim() || null,
        notes: notes.trim() || null,
        doses_per_period: null,
        dose_period: null,
        interval_count: parsedInterval,
        interval_unit: customIntervalUnit,
        reminder_time: formatReminderTimeHHmm(reminderDate),
        last_given_on: lastGivenOn.trim() || null,
      };

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
      return;
    }

    const dosePeriod = schedulePeriod as MedicationDosePeriod;
    const n = dosesPerPeriod.trim();
    const parsed = parseInt(n, 10);
    if (dosePeriod === "day" && (!Number.isFinite(parsed) || parsed < 1)) {
      return;
    }
    if (
      (dosePeriod === "week" || dosePeriod === "month") &&
      n !== "" &&
      (!Number.isFinite(parsed) || parsed < 1)
    ) {
      return;
    }

    const doses =
      dosePeriod === "day"
        ? Math.min(8, Math.max(1, parsed))
        : dosePeriod === "week" || dosePeriod === "month"
          ? Math.max(1, Number.isFinite(parsed) ? parsed : 1)
          : null;

    const freq = buildMedicationFrequencyLabelForDb(dosePeriod, doses, null);

    const payload = {
      name: name.trim(),
      dosage: dosageStr,
      frequency: freq,
      condition: condition.trim() || null,
      notes: notes.trim() || null,
      doses_per_period: doses,
      dose_period: dosePeriod,
      interval_count: null,
      interval_unit: null,
      reminder_time: formatReminderTimeHHmm(reminderDate),
      last_given_on: lastGivenOn.trim() || null,
    };

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
    reminderDate,
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
    if ((details.medications?.length ?? 0) >= 1 && !isPro) {
      replaceWithUpgrade();
    }
  }, [
    isNew,
    details,
    isPro,
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
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={Colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.navTitle} numberOfLines={2}>
            Add medication
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <CoCareReadOnlyNotice />
          <Text style={styles.leadReadOnly}>
            Adding medications requires permission from the primary caretaker.
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (!isNew && med && canManageMedications === false) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={Colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.navTitle} numberOfLines={2}>
            Medication details
          </Text>
          <PetNavAvatar
            displayPet={details}
            accessibilityLabelPrefix="Medication details for"
          />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <CoCareReadOnlyNotice />
          <ReadOnlyFieldRow label="Name" value={med.name} />
          <ReadOnlyFieldRow label="Dosage" value={med.dosage?.trim() || ""} />
          <ReadOnlyFieldRow
            label="Frequency"
            value={med.frequency?.trim() || ""}
          />
          <ReadOnlyFieldRow
            label="Condition"
            value={med.condition?.trim() || ""}
          />
          <ReadOnlyFieldRow label="Notes" value={med.notes?.trim() || ""} />
          <ReadOnlyFieldRow
            label="Reminder time"
            value={med.reminder_time?.trim() || "—"}
          />
          <ReadOnlyFieldRow
            label="Last given"
            value={med.last_given_on?.trim() || "—"}
          />
        </ScrollView>
      </View>
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
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={2}>
          {medNavTitle}
        </Text>
        <PetNavAvatar
          displayPet={details}
          accessibilityLabelPrefix={
            isNew ? "Adding medication for" : "Editing medication for"
          }
        />
      </View>

      <SafeAreaView style={styles.scrollSafe} edges={["bottom"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
          contentInsetAdjustmentBehavior="never"
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

            <Text style={styles.fieldLabel}>Dosage</Text>
            <View style={styles.row2}>
              <FormInput
                placeholder="Amt"
                value={dosageAmount}
                onChangeText={setDosageAmount}
                keyboardType="default"
                containerStyle={styles.smallInput}
              />
              <View style={{ flex: 1, zIndex: 40 }}>
                <DropdownSelect
                  placeholder="Type"
                  value={dosageType}
                  options={DOSAGE_TYPES}
                  onSelect={setDosageType}
                />
              </View>
            </View>

            <Text
              style={[
                styles.fieldLabel,
                (doseCountError ||
                  doseCountErrorWeekMonth ||
                  customIntervalError) &&
                  styles.fieldLabelError,
              ]}
            >
              Frequency *
            </Text>
            <View style={styles.row2}>
              {schedulePeriod !== "custom" ? (
                <FormInput
                  placeholder="Times"
                  value={dosesPerPeriod}
                  onChangeText={setDosesPerPeriod}
                  keyboardType="numeric"
                  containerStyle={styles.smallInput}
                  error={doseCountError || doseCountErrorWeekMonth}
                />
              ) : (
                <View style={styles.timesSpacer} />
              )}
              <View style={{ flex: 1, zIndex: 35 }}>
                <DropdownSelect
                  placeholder="Per"
                  value={
                    SCHEDULE_PERIOD_OPTIONS.find(
                      (o) => o.value === schedulePeriod,
                    )?.label ?? ""
                  }
                  options={SCHEDULE_PERIOD_OPTIONS.map((o) => o.label)}
                  onSelect={(label) => {
                    const m = SCHEDULE_PERIOD_OPTIONS.find(
                      (o) => o.label === label,
                    );
                    if (m) setSchedulePeriod(m.value);
                  }}
                />
              </View>
            </View>

            {schedulePeriod === "custom" ? (
              <>
                <Text style={styles.helperLabel}>Custom interval</Text>
                <Text style={styles.helperExample}>
                  Example: a dose every 3 months — enter{" "}
                  <Text style={styles.helperStrong}>3</Text> and choose{" "}
                  <Text style={styles.helperStrong}>months</Text>. That saves as
                  “{formatMedicationEveryIntervalLabel(3, "month")}
                  ”.
                </Text>
                <View style={styles.row2}>
                  <FormInput
                    placeholder="Every"
                    value={customIntervalCount}
                    onChangeText={setCustomIntervalCount}
                    keyboardType="numeric"
                    containerStyle={styles.smallInput}
                    error={customIntervalError}
                  />
                  <View style={{ flex: 1, zIndex: 34 }}>
                    <DropdownSelect
                      placeholder="Interval"
                      value={
                        INTERVAL_UNIT_OPTIONS.find(
                          (o) => o.value === customIntervalUnit,
                        )?.label ?? ""
                      }
                      options={INTERVAL_UNIT_OPTIONS.map((o) => o.label)}
                      onSelect={(label) => {
                        const opt = INTERVAL_UNIT_OPTIONS.find(
                          (o) => o.label === label,
                        );
                        if (opt) setCustomIntervalUnit(opt.value);
                      }}
                    />
                  </View>
                </View>
                {customIntervalCount.trim() !== "" &&
                Number.isFinite(parsedCustomInterval) &&
                parsedCustomInterval >= 1 ? (
                  <Text style={styles.previewLine}>
                    Preview:{" "}
                    {formatMedicationEveryIntervalLabel(
                      parsedCustomInterval,
                      customIntervalUnit,
                    )}
                  </Text>
                ) : null}
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Reminder time</Text>
            <Pressable
              style={styles.timeBtn}
              onPress={() => setShowTimePicker(true)}
            >
              <MaterialCommunityIcons
                name="clock-outline"
                size={22}
                color={Colors.orange}
              />
              <Text style={styles.timeBtnText}>
                {formatReminderTimeHHmm(reminderDate)}
              </Text>
            </Pressable>
            <ReminderTimePickerSheet
              visible={showTimePicker}
              value={reminderDate}
              onChange={setReminderDate}
              onClose={() => setShowTimePicker(false)}
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

            {validationAttempted &&
            (nameError ||
              doseCountError ||
              doseCountErrorWeekMonth ||
              customIntervalError) ? (
              <Text style={styles.formErrorHint}>
                Please fill in the required fields above.
              </Text>
            ) : null}

            <View style={styles.actionsBlock}>
              <OrangeButton
                onPress={handleSave}
                loading={saving}
                disabled={deleting}
                style={styles.saveBtn}
              >
                {isNew ? "Add medication" : "Save changes"}
              </OrangeButton>

              {!isNew ? (
                <Pressable
                  onPress={handleDelete}
                  disabled={saving || deleting}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    pressed && styles.deleteBtnPressed,
                  ]}
                >
                  <Text style={styles.deleteText}>
                    {deleting ? "Deleting…" : "Delete medication"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    lineHeight: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navSpacer: { width: 28 },
  leadReadOnly: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  scrollSafe: {
    flex: 1,
  },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  actionsBlock: {
    marginTop: 20,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelError: {
    color: Colors.error,
  },
  formErrorHint: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 12,
  },
  row2: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  helperLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  helperExample: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 19,
    marginBottom: 12,
  },
  helperStrong: {
    fontFamily: Font.uiSemiBold,
    color: Colors.textPrimary,
  },
  previewLine: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 16,
    marginTop: -4,
  },
  smallInput: {
    width: 88,
    marginBottom: 0,
  },
  timesSpacer: {
    width: 88,
  },
  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  timeBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  lastGivenWrap: {
    marginBottom: 12,
  },
  saveBtn: {
    marginTop: 0,
  },
  deleteBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  deleteBtnPressed: {
    opacity: 0.75,
  },
  deleteText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.error,
  },
  missing: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  backLink: {
    marginTop: 16,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
    textAlign: "center",
  },
});
