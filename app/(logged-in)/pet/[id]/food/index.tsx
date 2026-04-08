import PetFoodProfileCard from "@/components/ui/pet/PetFoodProfileCard";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useDeletePetFoodMutation, usePetDetailsQuery } from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { formatPetFoodPortionSubline, isTreatFood } from "@/lib/petFood";
import type { PetFood } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
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

export default function PetFoodManagerScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { push, router } = useNavigationCooldown();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);
  const canManageFood = useCanPerformAction(petId, "can_manage_food");
  const deleteMut = useDeletePetFoodMutation(petId ?? "");
  const { canAddAnotherOrUpgrade } = useProGateNavigation();

  const sortedFoods = useMemo(() => {
    if (!details?.foods) return [];
    return [...details.foods].sort((a, b) => {
      const ta = isTreatFood(a);
      const tb = isTreatFood(b);
      return ta === tb ? 0 : ta ? 1 : -1;
    });
  }, [details?.foods]);

  const confirmDelete = useCallback(
    (f: PetFood) => {
      Alert.alert(
        "Remove food?",
        `Remove “${f.brand.trim() || "this item"}” from ${details?.name ?? "this pet"}’s profile?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteMut.mutateAsync(f.id);
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                Alert.alert("Couldn't remove", msg);
              }
            },
          },
        ],
      );
    },
    [deleteMut, details?.name],
  );

  if (isLoading && !details) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!details || !petId) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.missing}>Pet not found.</Text>
      </View>
    );
  }

  if (canManageFood === undefined) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  const canEditFood = canManageFood === true;

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
          Food & treats
        </Text>
        <View style={styles.navSpacer} />
      </View>

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
          {canEditFood
            ? `Keep track of all your pet's meals and treats here. You can use these saved foods when logging activities for ${details.name}.`
            : "Tap a food to view its details."}
        </Text>

        {canEditFood ? (
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.addBtnPressed,
            ]}
            onPress={() =>
              canAddAnotherOrUpgrade(sortedFoods.length, () =>
                router.push(`/(logged-in)/pet/${petId}/food/new` as Href),
              )
            }
          >
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={22}
              color={Colors.orange}
            />
            <Text style={styles.addBtnText}>Add food or treat</Text>
          </Pressable>
        ) : null}

        {sortedFoods.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No foods on file yet.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sortedFoods.map((f) => (
              <View
                key={f.id}
                style={[styles.rowWrap, !canEditFood && styles.rowWrapSingle]}
              >
                <Pressable
                  style={styles.rowMain}
                  onPress={() =>
                    router.push(
                      `/(logged-in)/pet/${petId}/food/${f.id}` as Href,
                    )
                  }
                >
                  <PetFoodProfileCard
                    name={f.brand?.trim() || "Food"}
                    subline={formatPetFoodPortionSubline(f)}
                    isTreat={isTreatFood(f)}
                  />
                </Pressable>
                {canEditFood ? (
                  <Pressable
                    style={styles.deleteHit}
                    onPress={() => confirmDelete(f)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${f.brand}`}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={26}
                      color={Colors.error}
                    />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        )}
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
    alignItems: "center",
    justifyContent: "center",
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
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
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
  list: {
    gap: 12,
  },
  rowWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowWrapSingle: {
    gap: 0,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  deleteHit: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    justifyContent: "center",
  },
  empty: {
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  missing: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
