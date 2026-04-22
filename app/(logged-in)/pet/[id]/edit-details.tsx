import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import AutocompleteInput from "@/components/onboarding/AutocompleteInput";
import FormInput from "@/components/onboarding/FormInput";
import PetDateOfBirthField from "@/components/onboarding/petInfo/PetDateOfBirthField";
import PetSexToggle from "@/components/onboarding/petInfo/PetSexToggle";
import PetWeightFields from "@/components/onboarding/petInfo/PetWeightFields";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { getBreedLabelForPetType } from "@/constants/petInfo";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useBreedsQuery,
  usePetDetailsQuery,
  useUpdatePetDetailsMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import type { PetFormData } from "@/types/database";
import {
  formatDateOfBirth,
  formatPetWeightDisplay,
  parseDateOnlyYmd,
} from "@/utils/petDisplay";
import { yearsMonthsFromBirthDate } from "@/utils/petAge";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditPetDetailsScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);
  const canEditProfile = useCanPerformAction(petId, "can_edit_pet_profile");
  const updateMut = useUpdatePetDetailsMutation(petId ?? "");

  const breedPetType = details?.pet_type ?? "dog";
  const { data: breeds } = useBreedsQuery(breedPetType);

  const breedNames = useMemo(
    () => (breeds ?? []).map((b) => b.name),
    [breeds],
  );

  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [vetClinic, setVetClinic] = useState("");
  const [vetAddress, setVetAddress] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<PetFormData["weightUnit"]>("lbs");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState<PetFormData["sex"]>("male");
  const [attempted, setAttempted] = useState(false);

  /** Hydrate form once per pet — depend on `details.id`, not `details` (query refetches create new object refs and caused update-depth loops). */
  useEffect(() => {
    if (!details?.id) return;
    setBreed(details.breed?.trim() ?? "");
    setColor(details.color?.trim() ?? "");
    setVetClinic(details.primary_vet_clinic?.trim() ?? "");
    setVetAddress(details.primary_vet_address?.trim() ?? "");
    const w = details.weight_lbs;
    setWeight(w != null && Number.isFinite(w) ? String(w) : "");
    setWeightUnit(details.weight_unit ?? "lbs");
    const dob = details.date_of_birth;
    setDateOfBirth(
      parseDateOnlyYmd(
        typeof dob === "string" ? dob : dob != null ? String(dob) : "",
      ) ?? "",
    );
    setSex(details.sex === "female" ? "female" : "male");
  }, [details?.id]);

  const breedLabel = getBreedLabelForPetType(breedPetType);

  const weightError =
    attempted &&
    (weight.trim() === "" ||
      !Number.isFinite(parseFloat(weight.replace(",", "."))));

  const sexError = attempted && !sex;

  const handleSave = useCallback(async () => {
    if (!petId) return;
    setAttempted(true);
    const w = parseFloat(weight.replace(",", "."));
    if (weight.trim() === "" || !Number.isFinite(w)) return;
    if (!sex) return;

    const dobTrim = dateOfBirth.trim();
    if (dobTrim) {
      yearsMonthsFromBirthDate(dobTrim);
    }

    try {
      await updateMut.mutateAsync({
        breed: breed.trim() || null,
        color: color.trim() || null,
        primary_vet_clinic: vetClinic.trim() || null,
        primary_vet_address: vetAddress.trim() || null,
        weight_lbs: w,
        weight_unit: weightUnit,
        date_of_birth: dobTrim || null,
        sex,
      });
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't save", msg);
    }
  }, [
    petId,
    breed,
    color,
    vetClinic,
    vetAddress,
    weight,
    weightUnit,
    dateOfBirth,
    sex,
    updateMut,
    router,
  ]);

  if (isLoading || !details) {
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
    const dobYmd = parseDateOnlyYmd(
      typeof details.date_of_birth === "string"
        ? details.date_of_birth
        : details.date_of_birth != null
          ? String(details.date_of_birth)
          : "",
    );
    const dobFormatted = formatDateOfBirth(dobYmd);
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            Pet details
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: scrollInsetBottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CoCareReadOnlyNotice />
          <ReadOnlyFieldRow
            label="Breed"
            value={details.breed?.trim() || "—"}
          />
          <ReadOnlyFieldRow
            label="Color"
            value={details.color?.trim() || "—"}
          />
          <ReadOnlyFieldRow
            label="Vet clinic"
            value={details.primary_vet_clinic?.trim() || "—"}
          />
          <ReadOnlyFieldRow
            label="Vet address"
            value={details.primary_vet_address?.trim() || "—"}
          />
          <ReadOnlyFieldRow
            label="Weight"
            value={formatPetWeightDisplay(details)}
          />
          <ReadOnlyFieldRow
            label="Birthday"
            value={dobFormatted ?? "—"}
          />
          <ReadOnlyFieldRow
            label="Gender"
            value={details.sex === "female" ? "Female" : "Male"}
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
        <Text style={styles.navTitle} numberOfLines={1}>
          Edit details
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Update breed, color, vet, weight, birthday, and gender.
        </Text>

        <AutocompleteInput
          label={breedLabel}
          placeholder="Search or type a breed"
          value={breed}
          onChangeText={setBreed}
          onSelect={setBreed}
          suggestions={breedNames}
          containerStyle={styles.field}
        />

        <FormInput
          label="Color"
          value={color}
          onChangeText={setColor}
          placeholder="e.g. Black & tan"
          containerStyle={styles.field}
        />

        <FormInput
          label="Vet clinic"
          value={vetClinic}
          onChangeText={setVetClinic}
          placeholder="Clinic name"
          containerStyle={styles.field}
        />

        <FormInput
          label="Vet address"
          value={vetAddress}
          onChangeText={setVetAddress}
          placeholder="Street, city"
          containerStyle={styles.field}
        />

        <PetWeightFields
          weight={weight}
          weightUnit={weightUnit}
          onWeightChange={setWeight}
          onWeightUnitChange={setWeightUnit}
          weightError={weightError}
        />

        <Text style={styles.fieldLabel}>Birthday</Text>
        <PetDateOfBirthField
          dateOfBirth={dateOfBirth}
          onChangeDate={setDateOfBirth}
          onClearDate={() => setDateOfBirth("")}
        />

        <PetSexToggle sex={sex} onChange={setSex} error={sexError} />

        <OrangeButton
          onPress={handleSave}
          loading={updateMut.isPending}
          style={styles.saveBtn}
        >
          Save changes
        </OrangeButton>
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
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  field: {
    marginBottom: 16,
  },
  saveBtn: {
    marginTop: 8,
  },
});
