import VaccinationListRow from "@/components/ui/vaccination/VaccinationListRow";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useDeletePetVaccinationMutation,
  usePetDetailsQuery,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { getErrorMessage } from "@/lib/errorMessage";
import { vaccinationTraffic } from "@/lib/healthTraffic";
import type { PetVaccination } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useLocalSearchParams } from "expo-router";
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

function formatVaccinationSubline(v: PetVaccination): string {
  const exp = v.expires_on
    ? new Date(`${v.expires_on}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "—";
  const freq = v.frequency_label?.trim() || "—";
  return `${freq} · Exp. ${exp}`;
}

export default function PetVaccinationsListScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { push, router } = useNavigationCooldown();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;

  const { data: details, isLoading } = usePetDetailsQuery(petId);
  const canManageVaccinations = useCanPerformAction(
    petId,
    "can_manage_vaccinations",
  );
  const deleteMut = useDeletePetVaccinationMutation(petId ?? "");
  const { canAddAnotherOrUpgrade } = useProGateNavigation();

  const rows = useMemo(() => {
    if (!details?.vaccinations?.length) return [];
    return details.vaccinations.map((v) => {
      const t = vaccinationTraffic(v);
      return {
        v,
        badgeKind: t.kind,
        badgeLabel: t.label,
        subline: formatVaccinationSubline(v),
      };
    });
  }, [details?.vaccinations]);

  const confirmDelete = useCallback(
    (vaccinationId: string, name: string) => {
      Alert.alert(
        "Remove vaccination?",
        `Remove “${name.trim() || "this vaccination"}” from ${details?.name ?? "this pet"}’s profile?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteMut.mutateAsync(vaccinationId);
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
          Vaccinations
        </Text>
        <View style={styles.navSpacer} />
      </View>

      {isLoading && !details ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.orange} />
        </View>
      ) : !details || !petId ? (
        <View style={[styles.screen, { paddingTop: 24 }]}>
          <Text style={styles.missing}>Pet not found.</Text>
        </View>
      ) : canManageVaccinations === undefined ? (
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lead}>
            {canManageVaccinations
              ? "Tap a vaccination to edit it, add a new one below, or use ✕ to remove it from this pet’s profile."
              : "Tap a vaccination to view its details."}
          </Text>

          {canManageVaccinations ? (
            <Pressable
              style={({ pressed }) => [
                styles.addBtn,
                pressed && styles.addBtnPressed,
              ]}
              onPress={() =>
                canAddAnotherOrUpgrade(details?.vaccinations?.length ?? 0, () =>
                  push(`/(logged-in)/pet/${petId}/vaccinations/new` as Href),
                )
              }
            >
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={22}
                color={Colors.orange}
              />
              <Text style={styles.addBtnText}>Add vaccination</Text>
            </Pressable>
          ) : null}

          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No vaccination records on file yet.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {rows.map(({ v, badgeKind, badgeLabel, subline }) => (
                <VaccinationListRow
                  key={v.id}
                  variant="standalone"
                  title={v.name}
                  subline={subline}
                  badgeKind={badgeKind}
                  badgeLabel={badgeLabel}
                  onPress={() =>
                    push(
                      `/(logged-in)/pet/${petId}/vaccinations/${v.id}` as Href,
                    )
                  }
                  onDeletePress={
                    canManageVaccinations
                      ? () => confirmDelete(v.id, v.name)
                      : undefined
                  }
                />
              ))}
            </View>
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
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navSpacer: { width: 28 },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  list: {
    gap: 12,
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
  missing: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
