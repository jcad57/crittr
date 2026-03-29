import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import ReminderTimePickerSheet from "@/components/ui/ReminderTimePickerSheet";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  useDeleteMedicationMutation,
  useInsertMedicationMutation,
  usePetDetailsQuery,
  useUpdateMedicationMutation,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { getErrorMessage } from "@/lib/errorMessage";
import {
  buildMedicationFrequencyLabelForDb,
  formatReminderTimeHHmm,
  parseReminderTimeHHmm,
} from "@/lib/medicationSchedule";
import type { MedicationDosePeriod, PetMedication } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DOSAGE_TYPES = [
  "Tablet",
  "Injection",
  "Liquid",
  "Topical",
  "Chewable",
  "Other",
];

const PERIOD_OPTIONS: { label: string; value: MedicationDosePeriod }[] = [
  { label: "Per day", value: "day" },
  { label: "Per week", value: "week" },
  { label: "Per month", value: "month" },
];

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
  return {
    name: m.name,
    dosageAmount: amount,
    dosageType: type,
    dosesPerPeriod:
      m.doses_per_period != null ? String(m.doses_per_period) : "1",
    dosePeriod: (period ?? "day") as MedicationDosePeriod,
    condition: m.condition?.trim() ?? "",
    notes: m.notes?.trim() ?? "",
    reminderDate: parseReminderTimeHHmm(m.reminder_time ?? null),
  };
}

export default function EditPetMedicationScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();
  const { id: rawPetId, medicationId: rawMedId } = useLocalSearchParams<{
    id: string;
    medicationId: string;
  }>();
  const petId = Array.isArray(rawPetId) ? rawPetId[0] : rawPetId;
  const medicationId = Array.isArray(rawMedId) ? rawMedId[0] : rawMedId;
  const isNew = medicationId === "new";

  const { data: details, isLoading } = usePetDetailsQuery(petId);
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

  const [name, setName] = useState("");
  const [dosageAmount, setDosageAmount] = useState("");
  const [dosageType, setDosageType] = useState("");
  const [dosesPerPeriod, setDosesPerPeriod] = useState("1");
  const [dosePeriod, setDosePeriod] = useState<MedicationDosePeriod>("day");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);

  useEffect(() => {
    if (isNew || !med) return;
    const h = hydrateFromMed(med);
    setName(h.name);
    setDosageAmount(h.dosageAmount);
    setDosageType(h.dosageType);
    setDosesPerPeriod(h.dosesPerPeriod);
    setDosePeriod(h.dosePeriod);
    setCondition(h.condition);
    setNotes(h.notes);
    setReminderDate(h.reminderDate);
  }, [isNew, med]);

  const handleSave = useCallback(async () => {
    if (!petId || !medicationId) return;
    if (!isNew && !med) return;
    setValidationAttempted(true);
    const n = dosesPerPeriod.trim();
    const parsed = parseInt(n, 10);
    if (!name.trim()) {
      return;
    }
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

    const dosageStr =
      [dosageAmount.trim(), dosageType.trim()].filter(Boolean).join(" ") ||
      null;

    const freq = buildMedicationFrequencyLabelForDb(dosePeriod, doses, null);

    const payload = {
      name: name.trim(),
      dosage: dosageStr,
      frequency: freq,
      condition: condition.trim() || null,
      notes: notes.trim() || null,
      doses_per_period: doses,
      dose_period: dosePeriod,
      reminder_time: formatReminderTimeHHmm(reminderDate),
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
    dosePeriod,
    condition,
    notes,
    reminderDate,
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

  const saving = isNew ? insertMut.isPending : updateMut.isPending;
  const deleting = deleteMut.isPending;

  const parsedDoses = parseInt(dosesPerPeriod.trim(), 10);
  const nameError = validationAttempted && !name.trim();
  const doseCountError =
    validationAttempted &&
    dosePeriod === "day" &&
    (!Number.isFinite(parsedDoses) || parsedDoses < 1);
  const doseCountErrorWeekMonth =
    validationAttempted &&
    (dosePeriod === "week" || dosePeriod === "month") &&
    dosesPerPeriod.trim() !== "" &&
    (!Number.isFinite(parsedDoses) || parsedDoses < 1);

  const scrollContentMinHeight = useMemo(() => {
    const topChrome = insets.top + 8 + 56 + 12;
    return Math.max(windowHeight - topChrome - insets.bottom, 240);
  }, [insets.top, insets.bottom, windowHeight]);

  const petNameForTitle = details?.name?.trim() || "your pet";
  const medNavTitle = isNew
    ? `Add medication for ${petNameForTitle}`
    : `Edit medication for ${petNameForTitle}`;

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
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          styles.scrollContentGrow,
          { paddingBottom: scrollInsetBottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.scrollInner, { minHeight: scrollContentMinHeight }]}
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
                (doseCountError || doseCountErrorWeekMonth) &&
                  styles.fieldLabelError,
              ]}
            >
              Frequency *
            </Text>
            <View style={styles.row2}>
              <FormInput
                placeholder="Times"
                value={dosesPerPeriod}
                onChangeText={setDosesPerPeriod}
                keyboardType="numeric"
                containerStyle={styles.smallInput}
                error={doseCountError || doseCountErrorWeekMonth}
              />
              <View style={{ flex: 1, zIndex: 35 }}>
                <DropdownSelect
                  placeholder="Per"
                  value={
                    PERIOD_OPTIONS.find((o) => o.value === dosePeriod)
                      ?.label ?? ""
                  }
                  options={PERIOD_OPTIONS.map((o) => o.label)}
                  onSelect={(label) => {
                    const m = PERIOD_OPTIONS.find((o) => o.label === label);
                    if (m) setDosePeriod(m.value);
                  }}
                />
              </View>
            </View>

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

            <FormInput
              label="Condition (optional)"
              value={condition}
              onChangeText={setCondition}
              containerStyle={styles.field}
            />

            <FormInput
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              containerStyle={styles.field}
            />

            {validationAttempted &&
            (nameError || doseCountError || doseCountErrorWeekMonth) ? (
              <Text style={styles.formErrorHint}>
                Please fill in the required fields above.
              </Text>
            ) : null}
          </View>

          <View style={styles.actionsBlock}>
            <OrangeButton
              onPress={handleSave}
              disabled={saving || deleting}
              style={styles.saveBtn}
            >
              {saving
                ? "Saving…"
                : isNew
                  ? "Add medication"
                  : "Save changes"}
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
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navSpacer: { width: 28 },
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
  smallInput: {
    width: 88,
    marginBottom: 0,
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
  saveBtn: {
    marginTop: 0,
  },
  deleteBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 14,
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
