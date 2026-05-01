import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import ExpiryDateField from "@/components/onboarding/ExpiryDateField";
import FormInput from "@/components/onboarding/FormInput";
import VaccinationReadOnlyView from "@/components/petScreens/vaccinations/VaccinationReadOnlyView";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import {
  useDeletePetVaccinationMutation,
  useInsertPetVaccinationMutation,
  usePetDetailsQuery,
  useUpdatePetVaccinationMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { usePetScopedAfterSwitchPet } from "@/hooks/usePetScopedAfterSwitchPet";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { getErrorMessage } from "@/utils/errorMessage";
import { hydrateFromVaccination } from "@/utils/vaccinationEditHydration";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { styles } from "@/screen-styles/pet/[id]/vaccinations/[vaccinationId].styles";

export default function EditPetVaccinationScreen() {
  const insets = useSafeAreaInsets();
  const { replace, router } = useNavigationCooldown();
  const { id: rawPetId, vaccinationId: rawVacId } = useLocalSearchParams<{
    id: string;
    vaccinationId: string;
  }>();
  const petId = Array.isArray(rawPetId) ? rawPetId[0] : rawPetId;
  const vaccinationId = Array.isArray(rawVacId) ? rawVacId[0] : rawVacId;
  const isNew = vaccinationId === "new";

  const onPetSwitch = usePetScopedAfterSwitchPet(petId, replace);

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
  const { isPro, isProfileReady, replaceWithUpgrade } = useProGateNavigation();

  const [name, setName] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [notes, setNotes] = useState("");
  const [administeredOn, setAdministeredOn] = useState("");
  const [administeredBy, setAdministeredBy] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);

  useEffect(() => {
    if (isNew || !vaccination) return;
    const h = hydrateFromVaccination(vaccination);
    setName(h.name);
    setExpiresOn(h.expiresOn);
    setNotes(h.notes);
    setAdministeredOn(h.administeredOn);
    setAdministeredBy(h.administeredBy);
    setLotNumber(h.lotNumber);
  }, [isNew, vaccination]);

  const handleSave = useCallback(async () => {
    if (!petId) return;
    setValidationAttempted(true);
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      expires_on: expiresOn.trim() || null,
      frequency_label: null,
      notes: notes.trim() || null,
      administered_on: administeredOn.trim() || null,
      administered_by: administeredBy.trim() || null,
      lot_number: lotNumber.trim() || null,
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
    notes,
    administeredOn,
    administeredBy,
    lotNumber,
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

  useLayoutEffect(() => {
    if (!isNew || !details) return;
    if (canManageVaccinations !== true) return;
    if (!isProfileReady) return;
    if ((details.vaccinations?.length ?? 0) >= 1 && !isPro) {
      replaceWithUpgrade();
    }
  }, [
    isNew,
    details,
    isPro,
    isProfileReady,
    replaceWithUpgrade,
    canManageVaccinations,
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
    return (
      <VaccinationReadOnlyView
        vaccination={vaccination}
        details={details}
        insetsTop={insets.top}
        onBack={() => router.back()}
        onAfterSwitchPet={onPetSwitch}
      />
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
          onAfterSwitchPet={onPetSwitch}
        />
      </View>

      <SafeAreaView style={styles.scrollSafe} edges={["bottom"]}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
          bottomOffset={20}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <FormInput
            label="Vaccination name"
            required
            value={name}
            onChangeText={setName}
            containerStyle={styles.field}
            error={nameError}
            errorMessage={
              validationAttempted && nameError
                ? "Please enter a vaccination name."
                : undefined
            }
          />

          <View style={styles.expiryBlock}>
            <Text style={styles.fieldLabel}>Date administered</Text>
            <ExpiryDateField
              value={administeredOn}
              onChangeDate={setAdministeredOn}
              onClearDate={() => setAdministeredOn("")}
              placeholder="When was it given?"
            />
          </View>

          <View style={styles.expiryBlock}>
            <Text style={styles.fieldLabel}>Expires</Text>
            <ExpiryDateField
              value={expiresOn}
              onChangeDate={setExpiresOn}
              onClearDate={() => setExpiresOn("")}
              placeholder="When it expires or is due again (for reminders)"
            />
          </View>

          <FormInput
            label="Administered by"
            value={administeredBy}
            onChangeText={setAdministeredBy}
            placeholder="Vet or clinic name"
            containerStyle={styles.field}
          />

          <FormInput
            label="Lot number"
            value={lotNumber}
            onChangeText={setLotNumber}
            placeholder="Optional"
            containerStyle={styles.field}
          />

          <FormInput
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            containerStyle={styles.field}
          />

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
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}
