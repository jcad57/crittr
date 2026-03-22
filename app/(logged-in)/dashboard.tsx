import ActivityFeed from "@/components/ui/dashboard/ActivityFeed";
import AlertBanner from "@/components/ui/dashboard/AlertBanner";
import DailyProgress from "@/components/ui/dashboard/DailyProgress";
import DashboardHeader from "@/components/ui/dashboard/DashboardHeader";
import HealthSection from "@/components/ui/dashboard/HealthSection";
import PetManagement from "@/components/ui/dashboard/PetManagement";
import { Colors } from "@/constants/colors";
import {
  MOCK_ACTIVITIES,
  MOCK_ALERT,
  MOCK_DAILY_PROGRESS,
  MOCK_MEDICATIONS,
  MOCK_VET_VISITS,
  type Pet as MockPet,
} from "@/data/mockDashboard";
import { usePetStore } from "@/stores/petStore";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { pets: dbPets, activePetId, isLoading, fetchPets, setActivePet } =
    usePetStore();

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  const pets: MockPet[] = useMemo(
    () =>
      dbPets.map((p) => ({
        id: p.id,
        name: p.name,
        breed: p.breed ?? "",
        imageUrl: p.avatar_url,
      })),
    [dbPets],
  );

  if (isLoading && pets.length === 0) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
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
          onSwitchPet={setActivePet}
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
        <AlertBanner alert={MOCK_ALERT} />

        <View style={styles.section}>
          <DailyProgress categories={MOCK_DAILY_PROGRESS} />
        </View>

        <View style={styles.section}>
          <ActivityFeed activities={MOCK_ACTIVITIES} date="October 16, 2025" />
        </View>

        <View style={styles.section}>
          <HealthSection
            medications={MOCK_MEDICATIONS}
            vetVisits={MOCK_VET_VISITS}
          />
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
