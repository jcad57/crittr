import ActivityFeed from "@/components/ui/dashboard/ActivityFeed";
import DailyProgress from "@/components/ui/dashboard/DailyProgress";
import DashboardHeader from "@/components/ui/dashboard/DashboardHeader";
import HealthSection from "@/components/ui/dashboard/HealthSection";
import PetManagement from "@/components/ui/dashboard/PetManagement";
import { Colors } from "@/constants/colors";
import type {
  DailyProgressCategory,
  Medication,
  Pet,
} from "@/data/mockDashboard";
import { usePetStore } from "@/stores/petStore";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const {
    pets: dbPets,
    activePetId,
    activePetDetails,
    isLoading,
    fetchPets,
    fetchActivePetDetails,
    setActivePet,
  } = usePetStore();
  const router = useRouter();

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  useEffect(() => {
    if (activePetId) fetchActivePetDetails();
  }, [activePetId, fetchActivePetDetails]);

  const pets: Pet[] = useMemo(
    () =>
      dbPets.map((p) => ({
        id: p.id,
        name: p.name,
        breed: p.breed ?? "",
        imageUrl: p.avatar_url,
      })),
    [dbPets],
  );

  const activePetName = useMemo(() => {
    const pet = dbPets.find((p) => p.id === activePetId);
    return pet?.name ?? "your pet";
  }, [dbPets, activePetId]);

  const dailyProgress: DailyProgressCategory[] = useMemo(() => {
    const details = activePetDetails;
    const totalMeals = details
      ? details.foods
          .filter((f) => !f.is_treat)
          .reduce((sum, f) => sum + (f.meals_per_day ?? 1), 0)
      : 0;
    const totalTreats = details
      ? details.foods.filter((f) => f.is_treat).length || 1
      : 0;
    const totalExercise = details?.exercises_per_day ?? details?.exercise?.walks_per_day ?? 0;
    const totalMeds = details ? details.medications.length : 0;
    const hasMeds = totalMeds > 0;

    return [
      {
        id: "exercise",
        label: "Exercise",
        icon: "run",
        current: 0,
        total: totalExercise,
        ringColor: Colors.coral,
        trackColor: Colors.coralLight,
      },
      {
        id: "meals",
        label: "Meals",
        icon: "food-drumstick",
        current: 0,
        total: totalMeals,
        ringColor: Colors.lavender,
        trackColor: Colors.lavenderLight,
      },
      {
        id: "treats",
        label: "Treats",
        icon: "bone",
        current: 0,
        total: totalTreats,
        ringColor: Colors.sky,
        trackColor: Colors.skyLight,
      },
      {
        id: "meds",
        label: "Meds",
        icon: "pill",
        current: 0,
        total: hasMeds ? totalMeds : 0,
        ringColor: hasMeds ? Colors.gold : Colors.gray300,
        trackColor: hasMeds ? Colors.goldLight : Colors.gray100,
      },
    ];
  }, [activePetDetails]);

  const medications: Medication[] = useMemo(() => {
    if (!activePetDetails) return [];
    return activePetDetails.medications.map((m) => ({
      id: m.id,
      name: m.name,
      frequency: m.frequency ?? "Daily",
      condition: m.condition ?? "",
      dosageDesc: m.dosage ?? "",
      current: 0,
      total: 1,
      iconBg: Colors.gray100,
      iconColor: Colors.gray500,
    }));
  }, [activePetDetails]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const handleSwitchPet = useCallback(
    (id: string) => {
      setActivePet(id);
    },
    [setActivePet],
  );

  if (isLoading && pets.length === 0) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerPad}>
        <DashboardHeader
          pets={pets}
          activePetId={activePetId}
          onSwitchPet={handleSwitchPet}
          onProfilePress={() => router.push("/(tabs)/profile")}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <DailyProgress categories={dailyProgress} />
        </View>

        <View style={styles.section}>
          <ActivityFeed activities={[]} date={todayStr} />
        </View>

        <View style={styles.section}>
          <HealthSection medications={medications} vetVisits={[]} />
        </View>

        <View style={styles.section}>
          <PetManagement pets={pets} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerPad: {
    paddingHorizontal: 20,
  },
  scroll: {
    paddingTop: 10,
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
});
