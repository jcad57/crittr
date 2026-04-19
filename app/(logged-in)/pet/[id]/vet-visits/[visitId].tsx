import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import VetVisitLocationFields from "@/components/ui/health/VetVisitLocationFields";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { usePetDetailsQuery, usePetVetVisitsQuery } from "@/hooks/queries";
import {
  allActivitiesKey,
  healthSnapshotKey,
  petVetVisitsQueryKey,
  todayActivitiesPrefixKey,
} from "@/hooks/queries/queryKeys";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { getErrorMessage } from "@/lib/errorMessage";
import { queryClient } from "@/lib/queryClient";
import { syncTodayVetVisitMirrorsToActivities } from "@/lib/vetVisitActivityMirror";
import { syncCrittrReminderNotifications } from "@/lib/reminderNotificationSchedule";
import {
  hydrateVetVisitLocationState,
  resolveVetVisitLocation,
} from "@/lib/vetVisitLocationUi";
import { deleteVetVisit, updateVetVisit } from "@/services/health";
import { useAuthStore } from "@/stores/authStore";
import { notificationPrefsFromProfile } from "@/utils/pushNotificationPreferences";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditVetVisitScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const { id: rawPetId, visitId: rawVisitId } = useLocalSearchParams<{
    id: string;
    visitId: string;
  }>();
  const petId = Array.isArray(rawPetId) ? rawPetId[0] : rawPetId;
  const visitId = Array.isArray(rawVisitId) ? rawVisitId[0] : rawVisitId;

  const canManageVetVisits = useCanPerformAction(petId, "can_manage_vet_visits");

  const { data: visits, isLoading } = usePetVetVisitsQuery(petId);
  const { data: petDetails } = usePetDetailsQuery(petId);
  const visit = useMemo(
    () => visits?.find((v) => v.id === visitId),
    [visits, visitId],
  );

  const primaryClinic = petDetails?.primary_vet_clinic ?? null;

  const [title, setTitle] = useState("");
  const [locationChoice, setLocationChoice] = useState("");
  const [otherClinicText, setOtherClinicText] = useState("");
  const [notes, setNotes] = useState("");
  const [visitAt, setVisitAt] = useState(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!visit) return;
    if (visit.pet_id !== petId) return;
    setTitle(visit.title);
    const h = hydrateVetVisitLocationState(visit.location, primaryClinic);
    setLocationChoice(h.choice);
    setOtherClinicText(h.otherText);
    setNotes(visit.notes?.trim() ?? "");
    const d = new Date(visit.visit_at);
    if (!Number.isNaN(d.getTime())) setVisitAt(d);
  }, [visit, petId, primaryClinic]);

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

  const invalidateCaches = useCallback(async () => {
    if (userId) {
      await syncTodayVetVisitMirrorsToActivities(userId);
      await queryClient.invalidateQueries({
        queryKey: healthSnapshotKey(userId),
      });
    }
    if (petId) {
      await queryClient.invalidateQueries({
        queryKey: petVetVisitsQueryKey(petId),
      });
      await queryClient.invalidateQueries({
        queryKey: todayActivitiesPrefixKey(petId),
      });
      await queryClient.invalidateQueries({
        queryKey: allActivitiesKey(petId),
      });
      await queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
    }
    const profile = useAuthStore.getState().profile;
    if (userId && profile) {
      void syncCrittrReminderNotifications(
        userId,
        notificationPrefsFromProfile(profile),
      );
    }
  }, [userId, petId]);

  const onSave = useCallback(async () => {
    if (!visitId || !petId || !visit || visit.pet_id !== petId) return;
    const t = title.trim();
    if (!t) {
      Alert.alert("Missing title", "Add a short title for this visit.");
      return;
    }
    setSaving(true);
    try {
      const location = resolveVetVisitLocation(
        locationChoice,
        otherClinicText,
        primaryClinic,
      );
      await updateVetVisit({
        id: visitId,
        title: t,
        visit_at: visitAt,
        location,
        notes: notes.trim() || null,
      });
      await invalidateCaches();
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }, [
    visitId,
    petId,
    visit,
    title,
    locationChoice,
    otherClinicText,
    primaryClinic,
    notes,
    visitAt,
    invalidateCaches,
    router,
  ]);

  const onDelete = useCallback(() => {
    if (!visitId || !petId || !visit || visit.pet_id !== petId) return;
    Alert.alert(
      "Delete visit",
      "This removes the scheduled visit from your pet’s health timeline.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteVetVisit(visitId);
              await invalidateCaches();
              router.back();
            } catch (e) {
              Alert.alert("Couldn't delete", getErrorMessage(e));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [visitId, petId, visit, invalidateCaches, router]);

  const scrollContentMinHeight = useMemo(() => {
    const topChrome = insets.top + 8 + 56 + 12;
    return Math.max(windowHeight - topChrome - insets.bottom, 240);
  }, [insets.top, insets.bottom, windowHeight]);

  if (isLoading && !visits) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!visit || visit.pet_id !== petId) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.missing}>Visit not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (canManageVetVisits === undefined) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canManageVetVisits === false) {
    const whenReadOnly = new Date(visit.visit_at).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
          <Text style={styles.navTitle} numberOfLines={1}>
            Visit details
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: scrollInsetBottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CoCareReadOnlyNotice />
          <ReadOnlyFieldRow label="Title" value={visit.title} />
          <ReadOnlyFieldRow label="When" value={whenReadOnly} />
          <ReadOnlyFieldRow
            label="Location"
            value={visit.location?.trim() || "—"}
          />
          <ReadOnlyFieldRow
            label="Notes"
            value={visit.notes?.trim() || ""}
          />
        </ScrollView>
      </View>
    );
  }

  const busy = saving || deleting;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.navBack}>&lt; Back</Text>
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          Edit visit
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          styles.scrollContentGrow,
          { paddingBottom: scrollInsetBottom + 32 },
        ]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.scrollInner, { minHeight: scrollContentMinHeight }]}
        >
          <View style={styles.formFields}>
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
          </View>

          <View style={styles.actionsBlock}>
            <OrangeButton
              onPress={onSave}
              loading={saving}
              disabled={deleting || !title.trim()}
              style={styles.saveBtn}
            >
              Save changes
            </OrangeButton>

            <Pressable
              onPress={onDelete}
              disabled={busy}
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed && styles.deleteBtnPressed,
              ]}
            >
              <Text style={styles.deleteText}>
                {deleting ? "Deleting…" : "Delete visit"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollView>

      <DateTimePickerModal
        isVisible={pickerOpen}
        mode="datetime"
        date={visitAt}
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
  formFields: {
    gap: 8,
  },
  actionsBlock: {
    paddingTop: 8,
  },
  saveBtn: {
    marginTop: 0,
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
