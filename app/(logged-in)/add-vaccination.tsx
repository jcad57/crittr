import ExpiryDateField from "@/components/onboarding/ExpiryDateField";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetsQuery } from "@/hooks/queries";
import {
  healthSnapshotKey,
  petDetailsQueryKey,
} from "@/hooks/queries/queryKeys";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { queryClient } from "@/lib/queryClient";
import { createPetVaccination } from "@/services/health";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import type { Pet } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddVaccinationScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();
  const { petId: petIdParam } = useLocalSearchParams<{ petId?: string }>();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const setActivePet = usePetStore((s) => s.setActivePet);
  const activePetId = usePetStore((s) => s.activePetId);
  const { data: petsData } = usePetsQuery();
  const pets: Pet[] = petsData ?? [];

  const petId = useMemo(() => {
    if (petIdParam) {
      return pets.some((p) => p.id === petIdParam) ? petIdParam : "";
    }
    if (activePetId && pets.some((p) => p.id === activePetId))
      return activePetId;
    return pets[0]?.id ?? "";
  }, [petIdParam, activePetId, pets]);

  const pet = useMemo(
    () => (petId ? pets.find((p) => p.id === petId) : undefined),
    [pets, petId],
  );

  useEffect(() => {
    if (petId) setActivePet(petId);
  }, [petId, setActivePet]);

  const [name, setName] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [frequencyLabel, setFrequencyLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSave = async () => {
    if (!userId) return;
    const n = name.trim();
    if (!n) {
      Alert.alert("Missing name", "Enter the vaccination name (e.g. Rabies).");
      return;
    }
    if (!petId) {
      Alert.alert("No pet", "Add a pet first.");
      return;
    }
    setSubmitting(true);
    try {
      await createPetVaccination({
        pet_id: petId,
        name: n,
        expires_on: expiresOn.trim() || null,
        frequency_label: frequencyLabel.trim() || null,
        notes: notes.trim() || null,
      });
      await queryClient.invalidateQueries({
        queryKey: healthSnapshotKey(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: petDetailsQueryKey(petId),
      });
      router.back();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Could not save vaccination.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (pets.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
          <Text style={styles.navTitle} numberOfLines={1}>
            Add vaccination
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <Text style={styles.hint}>
          Add a pet before recording a vaccination.
        </Text>
      </View>
    );
  }

  if (!petId || !pet) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
          <Text style={styles.navTitle} numberOfLines={1}>
            Add vaccination
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <Text style={styles.hint}>
          Could not find this pet. Go back and try again.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
          <Text style={styles.navTitle} numberOfLines={1}>
            Add vaccination
          </Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.petBanner}>
            <MaterialCommunityIcons name="paw" size={20} color={Colors.orange} />
            <Text style={styles.petBannerText} numberOfLines={1}>
              {pet.name}
            </Text>
          </View>

          <Text style={styles.label}>Vaccination name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Rabies, DHPP"
            placeholderTextColor={Colors.gray400}
          />

          <Text style={styles.label}>Expires</Text>
          <ExpiryDateField
            value={expiresOn}
            onChangeDate={setExpiresOn}
            onClearDate={() => setExpiresOn("")}
            placeholder="Expiry date"
          />

          <Text style={styles.label}>Frequency</Text>
          <TextInput
            style={styles.input}
            value={frequencyLabel}
            onChangeText={setFrequencyLabel}
            placeholder="e.g. 1-year, 3-year"
            placeholderTextColor={Colors.gray400}
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notes]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything to remember"
            placeholderTextColor={Colors.gray400}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        <View
          style={[styles.footer, { paddingBottom: Math.max(scrollInsetBottom, 12) }]}
        >
          <OrangeButton onPress={onSave} disabled={submitting || !name.trim()}>
            {submitting ? "Saving…" : "Save vaccination"}
          </OrangeButton>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  navSpacer: { minWidth: 72 },
  scroll: {
    flex: 1,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray200,
    backgroundColor: Colors.cream,
  },
  petBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  petBannerText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  input: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notes: {
    minHeight: 88,
    paddingTop: 14,
  },
  hint: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
});
