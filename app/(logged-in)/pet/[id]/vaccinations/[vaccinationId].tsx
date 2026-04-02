import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import ExpiryDateField from "@/components/onboarding/ExpiryDateField";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useDeletePetVaccinationMutation,
  useInsertPetVaccinationMutation,
  usePetDetailsQuery,
  useUpdatePetVaccinationMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { getErrorMessage } from "@/lib/errorMessage";
import type { PetVaccination } from "@/types/database";
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
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

function hydrateFromVaccination(v: PetVaccination) {
  return {
    name: v.name?.trim() ?? "",
    expiresOn: v.expires_on?.trim() ?? "",
    frequencyLabel: v.frequency_label?.trim() ?? "",
    notes: v.notes?.trim() ?? "",
  };
}

export default function EditPetVaccinationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: rawPetId, vaccinationId: rawVacId } = useLocalSearchParams<{
    id: string;
    vaccinationId: string;
  }>();
  const petId = Array.isArray(rawPetId) ? rawPetId[0] : rawPetId;
  const vaccinationId = Array.isArray(rawVacId) ? rawVacId[0] : rawVacId;
  const isNew = vaccinationId === "new";

  const { data: details, isLoading } = usePetDetailsQuery(petId);
  const canManageVaccinations = useCanPerformAction(
    petId,
    "can_manage_vaccinations",
  );
  const vaccination = useMemo(
    () =>
      !isNew && vaccinationId
        ? details?.vaccinations.find((x) => x.id === vaccinationId)
        : undefined,
    [details?.vaccinations, vaccinationId, isNew],
  );

  const insertMut = useInsertPetVaccinationMutation(petId ?? "");
  const updateMut = useUpdatePetVaccinationMutation(petId ?? "");
  const deleteMut = useDeletePetVaccinationMutation(petId ?? "");

  const [name, setName] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [frequencyLabel, setFrequencyLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);

  useEffect(() => {
    if (isNew || !vaccination) return;
    const h = hydrateFromVaccination(vaccination);
    setName(h.name);
    setExpiresOn(h.expiresOn);
    setFrequencyLabel(h.frequencyLabel);
    setNotes(h.notes);
  }, [isNew, vaccination]);

  const handleSave = useCallback(async () => {
    if (!petId) return;
    setValidationAttempted(true);
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      expires_on: expiresOn.trim() || null,
      frequency_label: frequencyLabel.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (isNew) {
        await insertMut.mutateAsync(payload);
      } else {
        if (!vaccinationId) return;
        await updateMut.mutateAsync({
          vaccinationId,
          updates: payload,
        });
      }
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save", getErrorMessage(e));
    }
  }, [
    petId,
    name,
    expiresOn,
    frequencyLabel,
    notes,
    isNew,
    vaccinationId,
    insertMut,
    updateMut,
    router,
  ]);

  const handleDelete = useCallback(() => {
    if (!petId || !vaccinationId || isNew) return;
    Alert.alert(
      "Delete vaccination",
      "This removes it from your pet’s profile.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMut.mutateAsync(vaccinationId);
              router.back();
            } catch (e) {
              Alert.alert("Couldn't delete", getErrorMessage(e));
            }
          },
        },
      ],
    );
  }, [petId, vaccinationId, isNew, deleteMut, router]);

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

  if (!isNew && !isLoading && !vaccination) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.missing}>Vaccination not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (details && canManageVaccinations === undefined) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (isNew && canManageVaccinations === false) {
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
            Add vaccination
          </Text>
          <View style={styles.navSpacerWide} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <CoCareReadOnlyNotice />
          <Text style={styles.leadReadOnly}>
            Adding vaccinations requires permission from the primary caretaker.
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (!isNew && vaccination && canManageVaccinations === false) {
    const expLabel = vaccination.expires_on
      ? new Date(`${vaccination.expires_on}T12:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" },
        )
      : "—";
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
            Vaccination details
          </Text>
          <PetNavAvatar
            displayPet={details}
            accessibilityLabelPrefix="Vaccination details for"
          />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <CoCareReadOnlyNotice />
          <ReadOnlyFieldRow label="Name" value={vaccination.name} />
          <ReadOnlyFieldRow label="Expires" value={expLabel} />
          <ReadOnlyFieldRow
            label="Frequency"
            value={vaccination.frequency_label?.trim() || "—"}
          />
          <ReadOnlyFieldRow
            label="Notes"
            value={vaccination.notes?.trim() || ""}
          />
        </ScrollView>
      </View>
    );
  }

  const saving = isNew ? insertMut.isPending : updateMut.isPending;
  const deleting = deleteMut.isPending;
  const nameError = validationAttempted && !name.trim();
  const navTitle = isNew ? "Add vaccination" : "Edit vaccination";

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
          {navTitle}
        </Text>
        <PetNavAvatar
          displayPet={details}
          accessibilityLabelPrefix={
            isNew ? "Adding vaccination for" : "Editing vaccination for"
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
          <FormInput
            label="Vaccination name"
            value={name}
            onChangeText={setName}
            containerStyle={styles.field}
            error={nameError}
          />

          <View style={styles.expiryBlock}>
            <Text style={styles.fieldLabel}>Expires</Text>
            <ExpiryDateField
              value={expiresOn}
              onChangeDate={setExpiresOn}
              onClearDate={() => setExpiresOn("")}
              placeholder="Expiry date"
            />
          </View>

          <FormInput
            label="Frequency"
            value={frequencyLabel}
            onChangeText={setFrequencyLabel}
            placeholder="e.g. 1-year, 3-year"
            containerStyle={styles.field}
          />

          <FormInput
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            containerStyle={styles.field}
          />

          {validationAttempted && nameError ? (
            <Text style={styles.formErrorHint}>
              Please enter a vaccination name.
            </Text>
          ) : null}

          <View style={styles.actionsBlock}>
            <OrangeButton
              onPress={handleSave}
              loading={saving}
              disabled={deleting}
              style={styles.saveBtn}
            >
              {isNew ? "Add vaccination" : "Save changes"}
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
                  {deleting ? "Deleting…" : "Delete vaccination"}
                </Text>
              </Pressable>
            ) : null}
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
  navSpacerWide: { width: 28 },
  leadReadOnly: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
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
  scrollSafe: {
    flex: 1,
  },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  field: {
    marginBottom: 16,
  },
  expiryBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  formErrorHint: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 12,
  },
  actionsBlock: {
    marginTop: 20,
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
