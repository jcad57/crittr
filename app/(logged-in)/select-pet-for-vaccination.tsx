import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetsQuery } from "@/hooks/queries";
import { isPetActiveForDashboard } from "@/lib/petParticipation";
import { usePetStore } from "@/stores/petStore";
import type { Pet } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Shown from Health when the filter is “All pets” and the user adds a vaccination.
 * Choosing a pet sets it as active and opens add-vaccination for that pet.
 */
export default function SelectPetForVaccinationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setActivePet = usePetStore((s) => s.setActivePet);
  const { data: petsData } = usePetsQuery();
  const pets: Pet[] = (petsData ?? []).filter(isPetActiveForDashboard);

  const onPickPet = (pet: Pet) => {
    setActivePet(pet.id);
    router.replace(`/(logged-in)/add-vaccination?petId=${pet.id}`);
  };

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
        {pets.map((pet) => {
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
