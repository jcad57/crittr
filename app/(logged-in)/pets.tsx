import PetFeatureCard from "@/components/ui/pets/PetFeatureCard";
import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { usePetsQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { isPetActiveForDashboard } from "@/lib/petParticipation";
import { sortPetsByCreatedAt } from "@/lib/petSort";
import type { Pet, PetWithRole } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

export default function PetsScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();
  const { data, isLoading } = usePetsQuery();
  const dbPets: Pet[] | undefined = data;
  const ordered = useMemo(() => {
    if (!dbPets?.length) return [];
    const sorted = sortPetsByCreatedAt(dbPets);
    const living = sorted.filter(isPetActiveForDashboard);
    const memorial = sorted.filter((p) => !isPetActiveForDashboard(p));
    return [...living, ...memorial];
  }, [dbPets]);

  const companionLabel =
    ordered.length === 1 ? "1 companion" : `${ordered.length} companions`;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>My pets</Text>
          <Text style={styles.subtitle}>
            {isLoading && !dbPets?.length ? "…" : companionLabel}
          </Text>
        </View>
        <Pressable
          style={styles.fab}
          onPress={() => router.push("/(logged-in)/add-pet")}
          accessibilityRole="button"
          accessibilityLabel="Add a pet"
        >
          <MaterialCommunityIcons name="plus" size={28} color={Colors.white} />
        </Pressable>
      </View>

      {isLoading && !dbPets?.length ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.orange} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollInsetBottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {ordered.map((pet, index) => {
            const livingBefore = ordered
              .slice(0, index)
              .filter(isPetActiveForDashboard).length;
            const variant = !isPetActiveForDashboard(pet)
              ? "memorial"
              : livingBefore % 2 === 0
                ? "orange"
                : "dark";
            return (
              <PetFeatureCard
                key={pet.id}
                pet={pet}
                variant={variant}
                role={(pet as PetWithRole).role}
              />
            );
          })}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 18,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
});
