import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import AutocompleteInput from "@/components/onboarding/AutocompleteInput";
import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { getBreedLabelForPetType } from "@/constants/petInfo";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useBreedsQuery,
  usePetDetailsQuery,
  useUpdatePetNameAndBreedMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
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

export default function EditPetNameAndBreedScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);
  const canEditProfile = useCanPerformAction(petId, "can_edit_pet_profile");
  const updateMut = useUpdatePetNameAndBreedMutation(petId ?? "");

  const breedPetType = details?.pet_type ?? "dog";
  const { data: breeds } = useBreedsQuery(breedPetType);

  const breedNames = useMemo(
    () => (breeds ?? []).map((b) => b.name),
    [breeds],
  );

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!details?.id) return;
    setName(details.name?.trim() ?? "");
    setBreed(details.breed?.trim() ?? "");
  }, [details?.id]);

  const breedLabel = getBreedLabelForPetType(breedPetType);

  const nameMissing = attempted && !name.trim();

  const handleSave = useCallback(async () => {
    if (!petId) return;
    setAttempted(true);
    if (!name.trim()) return;

    try {
      await updateMut.mutateAsync({
        name: name.trim(),
        breed: breed.trim() || null,
      });
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't save", msg);
    }
  }, [petId, name, breed, updateMut, router]);

  if (isLoading || !details) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canEditProfile === undefined) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canEditProfile === false) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            Name & breed
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollBody,
            { paddingBottom: scrollInsetBottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CoCareReadOnlyNotice />
          <ReadOnlyFieldRow label="Name" value={details.name?.trim() || "—"} />
          <ReadOnlyFieldRow
            label={breedLabel}
            value={details.breed?.trim() || "—"}
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
          Name & breed
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <KeyboardAwareScrollView
        style={[styles.keyboardAvoid, styles.scroll]}
        contentContainerStyle={styles.scrollBody}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
          <Text style={styles.lead}>
            Update how this pet appears on their profile and around the app.
          </Text>

          <FormInput
            label="Name"
            required
            value={name}
            onChangeText={setName}
            placeholder="Pet name"
            containerStyle={styles.field}
            error={nameMissing}
          />

          <AutocompleteInput
            label={breedLabel}
            placeholder="Search or type a breed"
            value={breed}
            onChangeText={setBreed}
            onSelect={setBreed}
            suggestions={breedNames}
            containerStyle={styles.field}
          />
        <View
          style={[styles.saveFooter, { paddingBottom: scrollInsetBottom + 16 }]}
        >
          <OrangeButton onPress={handleSave} loading={updateMut.isPending}>
            Save changes
          </OrangeButton>
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
  keyboardAvoid: {
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollBody: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  saveFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray200,
    backgroundColor: Colors.cream,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
});
