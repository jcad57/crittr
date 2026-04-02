import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { userPetPermissionsKey } from "@/hooks/queries/queryKeys";
import { usePetsQuery } from "@/hooks/queries";
import { isPetActiveForDashboard } from "@/lib/petParticipation";
import { fetchUserPermissionsForPet } from "@/services/coCare";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import type { CoCarePermissions, Pet } from "@/types/database";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";

type PetPermRow = {
  role: "owner" | "co_carer";
  permissions: CoCarePermissions;
};
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Shown from Health when the filter is “All pets” and the user adds a vaccination.
 * Choosing a pet opens the add-vaccination form for that pet.
 */
export default function SelectPetForVaccinationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const setActivePet = usePetStore((s) => s.setActivePet);
  const { data: petsData } = usePetsQuery();
  const pets: Pet[] = (petsData ?? []).filter(isPetActiveForDashboard);

  const permQueries = useQueries({
    queries: pets.map((pet) => ({
      queryKey: userPetPermissionsKey(pet.id, userId ?? ""),
      queryFn: () => fetchUserPermissionsForPet(pet.id, userId!),
      enabled: !!userId && pets.length > 0,
    })),
  });

  const permQueryRows = permQueries as unknown as UseQueryResult<
    PetPermRow,
    Error
  >[];

  const petsAllowed = useMemo(() => {
    if (!userId) return [];
    return pets.filter((pet, i) => {
      const row = permQueryRows[i]?.data;
      if (!row) return false;
      return (
        row.role === "owner" || row.permissions.can_manage_vaccinations === true
      );
    });
  }, [pets, permQueryRows, userId]);

  const permsLoading =
    !!userId &&
    pets.length > 0 &&
    permQueryRows.some((q) => q.isPending || q.isFetching);

  const onPickPet = (pet: Pet) => {
    setActivePet(pet.id);
    router.replace(`/(logged-in)/pet/${pet.id}/vaccinations/new`);
  };

  if (permsLoading) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.navBack}>&lt; Back</Text>
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          Choose a pet
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <Text style={styles.subtitle}>
        Which pet is this vaccination for?
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {pets.length === 0 ? (
          <Text style={styles.empty}>
            You have no active pets to add a vaccination for. Memorialized pets
            are kept for remembrance only.
          </Text>
        ) : null}
        {pets.length > 0 && petsAllowed.length === 0 ? (
          <Text style={styles.empty}>
            You do not have permission to add vaccinations for any of your
            pets. Ask the primary caretaker to grant vaccination access in
            co-care settings.
          </Text>
        ) : null}
        {petsAllowed.map((pet) => {
          const uri = pet.avatar_url?.trim() || null;
          return (
            <Pressable
              key={pet.id}
              style={styles.row}
              onPress={() => onPickPet(pet)}
              android_ripple={{ color: Colors.gray200 }}
            >
              <View style={styles.avatar}>
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={styles.avatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="paw"
                    size={28}
                    color={Colors.orange}
                  />
                )}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {pet.name}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={Colors.gray400}
              />
            </Pressable>
          );
        })}
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
    flex: 1,
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
  subtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    gap: 10,
  },
  empty: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: "center",
    paddingVertical: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 48,
    height: 48,
  },
  name: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 17,
    color: Colors.textPrimary,
    minWidth: 0,
  },
});
