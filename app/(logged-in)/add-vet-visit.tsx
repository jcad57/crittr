import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import VetVisitLocationFields from "@/components/ui/health/VetVisitLocationFields";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  healthSnapshotKey,
  petVetVisitsQueryKey,
} from "@/hooks/queries/queryKeys";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { queryClient } from "@/lib/queryClient";
import { resolveVetVisitLocation } from "@/lib/vetVisitLocationUi";
import { createVetVisit } from "@/services/health";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePetsQuery } from "@/hooks/queries";
import type { Pet } from "@/types/database";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function defaultVisitDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

function startOfToday(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

export default function AddVetVisitScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();
  const { petId: rawPetIdParam } = useLocalSearchParams<{ petId?: string }>();
  const petIdParam = Array.isArray(rawPetIdParam) ? rawPetIdParam[0] : rawPetIdParam;
  const userId = useAuthStore((s) => s.session?.user?.id);
  const activePetId = usePetStore((s) => s.activePetId);
  const setActivePet = usePetStore((s) => s.setActivePet);
  const { data: petsData } = usePetsQuery();
  const pets: Pet[] = petsData ?? [];

  /** Apply ?petId= once when opening from a deep link; otherwise scheduling uses global active pet. */
  const appliedPetParamRef = useRef(false);
  useEffect(() => {
    if (appliedPetParamRef.current) return;
    if (!pets.length) return;
    appliedPetParamRef.current = true;
    if (petIdParam && pets.some((p) => p.id === petIdParam)) {
      setActivePet(petIdParam);
    }
  }, [pets, petIdParam, setActivePet]);

  const petId = useMemo(() => {
    if (activePetId && pets.some((p) => p.id === activePetId)) {
      return activePetId;
    }
    return pets[0]?.id ?? "";
  }, [activePetId, pets]);

  const schedulingPet = useMemo(
    () => (petId ? pets.find((p) => p.id === petId) ?? null : null),
    [pets, petId],
  );

  const [title, setTitle] = useState("Vet visit");
  const [locationChoice, setLocationChoice] = useState("");
  const [otherClinicText, setOtherClinicText] = useState("");
  const [notes, setNotes] = useState("");
  const [visitAt, setVisitAt] = useState(defaultVisitDate);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const primaryClinic = useMemo(
    () => pets.find((p) => p.id === petId)?.primary_vet_clinic ?? null,
    [pets, petId],
  );

  useEffect(() => {
    const p = primaryClinic?.trim();
    if (p) {
      setLocationChoice(p);
      setOtherClinicText("");
    } else {
      setLocationChoice("");
      setOtherClinicText("");
    }
  }, [petId, primaryClinic]);

  const whenLabel = useMemo(
    () =>
      visitAt.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    [visitAt],
  );

  const onSave = async () => {
    if (!userId) return;
    const t = title.trim();
    if (!t) {
      Alert.alert("Missing title", "Add a short title for this visit.");
      return;
    }
    if (!petId) {
      Alert.alert("No pet", "Add a pet first.");
      return;
    }
    if (visitAt.getTime() < Date.now() - 60_000) {
      Alert.alert("Date & time", "Choose a time in the future.");
      return;
    }
    setSubmitting(true);
    try {
      const location = resolveVetVisitLocation(
        locationChoice,
        otherClinicText,
        primaryClinic,
      );
      await createVetVisit({
        pet_id: petId,
        title: t,
        visit_at: visitAt,
        location,
        notes: notes.trim() || null,
      });
      await queryClient.invalidateQueries({
        queryKey: healthSnapshotKey(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: petVetVisitsQueryKey(petId),
      });
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save visit.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (pets.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <View style={styles.navSideLeft}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.navBack}>&lt; Back</Text>
            </Pressable>
          </View>
          <Text style={styles.navTitle} numberOfLines={1}>
            Vet visit
          </Text>
          <View style={styles.navSideRight} />
        </View>
        <Text style={styles.hint}>
          Add a pet before scheduling a visit.
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
          <View style={styles.navSideLeft}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.navBack}>&lt; Back</Text>
            </Pressable>
          </View>
          <Text style={styles.navTitle} numberOfLines={1}>
            Schedule visit
          </Text>
          <View style={styles.navSideRight}>
            <PetNavAvatar
              displayPet={schedulingPet ?? undefined}
              accessibilityLabelPrefix="Scheduling visit for"
            />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Annual checkup"
            placeholderTextColor={Colors.gray400}
          />

          <Text style={styles.label}>When</Text>
          <Pressable
            style={styles.whenBtn}
            onPress={() => setPickerOpen(true)}
          >
            <MaterialCommunityIcons
              name="calendar-clock"
              size={22}
              color={Colors.gray500}
            />
            <Text style={styles.whenText}>{whenLabel}</Text>
          </Pressable>

          <VetVisitLocationFields
            primaryVetClinic={primaryClinic}
            choice={locationChoice}
            otherText={otherClinicText}
            onChoiceChange={setLocationChoice}
            onOtherTextChange={setOtherClinicText}
          />

          <Text style={styles.label}>Notes (optional)</Text>
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
          style={[
            styles.footer,
            { paddingBottom: Math.max(scrollInsetBottom, 12) },
          ]}
        >
          <OrangeButton
            onPress={onSave}
            disabled={submitting || !title.trim()}
          >
            {submitting ? "Saving…" : "Save visit"}
          </OrangeButton>
        </View>
      </View>

      <DateTimePickerModal
        isVisible={pickerOpen}
        mode="datetime"
        date={visitAt}
        minimumDate={startOfToday()}
        is24Hour={false}
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onConfirm={(d) => {
          setPickerOpen(false);
          setVisitAt(d);
        }}
        onCancel={() => setPickerOpen(false)}
        confirmTextIOS="Save"
        cancelTextIOS="Cancel"
        buttonTextColorIOS={Colors.orange}
      />
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
  /** Same width as navSideRight so the title centers on screen (matches pet edit screens). */
  navSideLeft: {
    width: 72,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  navSideRight: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  navBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
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
    minHeight: 100,
    paddingTop: 14,
  },
  whenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  whenText: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  hint: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
});
