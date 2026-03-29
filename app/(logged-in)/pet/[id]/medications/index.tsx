import HealthListCard from "@/components/ui/health/HealthListCard";
import MedicationListRow from "@/components/ui/medication/MedicationListRow";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  useDeleteMedicationMutation,
  usePetDetailsQuery,
  useTodayActivitiesQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { getMedicationBadgeDisplay } from "@/lib/medicationBadgeDisplay";
import { buildMedicationDosageProgress } from "@/lib/medicationDosageProgress";
import { getErrorMessage } from "@/lib/errorMessage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PetMedicationsListScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;

  const { data: details, isLoading } = usePetDetailsQuery(petId);
  const { data: todayActivities } = useTodayActivitiesQuery(petId ?? null);
  const deleteMut = useDeleteMedicationMutation(petId ?? "");

  const rows = useMemo(() => {
    if (!details || !petId) return [];
    const acts = todayActivities ?? [];
    return details.medications.map((m) => {
      const prog = buildMedicationDosageProgress(m, acts, petId);
      const badge = getMedicationBadgeDisplay(m, prog);
      const subline = [m.frequency, m.condition, m.dosage]
        .filter((s) => s && String(s).trim())
        .join(" · ");
      return { m, badge, subline };
    });
  }, [details, petId, todayActivities]);

  const confirmDelete = useCallback(
    (medicationId: string, name: string) => {
      Alert.alert(
        "Remove medication?",
        `Remove “${name.trim() || "this medication"}” from ${details?.name ?? "this pet"}’s profile? Past activity logs may still reference it.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteMut.mutateAsync(medicationId);
              } catch (e) {
                Alert.alert("Couldn't remove", getErrorMessage(e));
              }
            },
          },
        ],
      );
    },
    [deleteMut, details?.name],
  );

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
        <Text style={styles.navTitle} numberOfLines={1}>
          Medications
        </Text>
        <View style={styles.navSpacer} />
      </View>

      {isLoading && !details ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.orange} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: scrollInsetBottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lead}>
            Tap a medication to edit it, add a new one below, or use ✕ to
            remove it from this pet’s profile.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.addBtnPressed,
            ]}
            onPress={() =>
              router.push(
                `/(logged-in)/pet/${petId}/medications/new` as Href,
              )
            }
          >
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={22}
              color={Colors.orange}
            />
            <Text style={styles.addBtnText}>Add medication</Text>
          </Pressable>

          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No medications on file yet.</Text>
            </View>
          ) : (
            <HealthListCard>
              {rows.map(({ m, badge, subline }, i) => (
                <MedicationListRow
                  key={m.id}
                  title={m.name}
                  subline={subline}
                  badgeKind={badge.kind}
                  badgeLabel={badge.label}
                  isLast={i === rows.length - 1}
                  onPress={() =>
                    router.push(
                      `/(logged-in)/pet/${petId}/medications/${m.id}` as Href,
                    )
                  }
                  onDeletePress={() => confirmDelete(m.id, m.name)}
                />
              ))}
            </HealthListCard>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navSpacer: { width: 28 },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 4,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.orange,
    backgroundColor: Colors.white,
    marginBottom: 20,
  },
  addBtnPressed: {
    opacity: 0.85,
  },
  addBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  empty: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
