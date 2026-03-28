import ActivityFeed from "@/components/ui/dashboard/ActivityFeed";
import DailyProgress from "@/components/ui/dashboard/DailyProgress";
import DashboardHeader from "@/components/ui/dashboard/DashboardHeader";
import DashboardLoading from "@/components/ui/dashboard/DashboardLoading";
import HealthSection from "@/components/ui/dashboard/HealthSection";
import PetManagement from "@/components/ui/dashboard/PetManagement";
import SectionLabel from "@/components/ui/dashboard/SectionLabel";
import { Colors } from "@/constants/colors";
import type {
  DailyProgressCategory,
  Medication,
  Pet,
} from "@/data/mockDashboard";
import { usePetDetailsQuery, usePetsQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { isTreatFood, treatDailyTarget } from "@/lib/petFood";
import { usePetStore } from "@/stores/petStore";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();

  const { data: dbPets, isLoading: isPetsLoading } = usePetsQuery();
  const { activePetId, setActivePet, initActivePetFromList } = usePetStore();

  useEffect(() => {
    if (dbPets?.length) initActivePetFromList(dbPets);
  }, [dbPets, initActivePetFromList]);

  const { data: activePetDetails, isLoading: isDetailsLoading } =
    usePetDetailsQuery(activePetId);

  const pets: Pet[] = useMemo(
    () =>
      (dbPets ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        breed: p.breed ?? "",
        imageUrl: p.avatar_url,
      })),
    [dbPets],
  );

  const dailyProgress: DailyProgressCategory[] = useMemo(() => {
    const details = activePetDetails ?? null;
    const totalMeals = details
      ? details.foods
          .filter((f) => !isTreatFood(f))
          .reduce((sum, f) => sum + (f.meals_per_day ?? 1), 0)
      : 0;
    const totalTreats = details
      ? details.foods.reduce((sum, f) => sum + treatDailyTarget(f), 0)
      : 0;
    const totalExercise =
      details?.exercises_per_day ?? details?.exercise?.walks_per_day ?? 0;
    const totalMeds = details ? details.medications.length : 0;
    const hasMeds = totalMeds > 0;

    return [
      {
        id: "exercise",
        label: "Exercise",
        icon: "run",
        current: 0,
        total: totalExercise,
        ringColor: Colors.progressExercise,
        trackColor: Colors.progressExerciseTrack,
      },
      {
        id: "meals",
        label: "Meals",
        icon: "food-drumstick",
        current: 0,
        total: totalMeals,
        ringColor: Colors.progressMeals,
        trackColor: Colors.progressMealsTrack,
      },
      {
        id: "treats",
        label: "Treats",
        icon: "bone",
        current: 0,
        total: totalTreats,
        ringColor: Colors.progressTreats,
        trackColor: Colors.progressTreatsTrack,
      },
      {
        id: "meds",
        label: "Meds",
        icon: "pill",
        current: 0,
        total: hasMeds ? totalMeds : 0,
        ringColor: Colors.progressMeds,
        trackColor: Colors.progressMedsTrack,
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
      iconBg: Colors.amberLight,
      iconColor: Colors.amberDark,
    }));
  }, [activePetDetails]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  const handleSwitchPet = useCallback(
    (id: string) => {
      setActivePet(id);
    },
    [setActivePet],
  );

  const showDetailsLoader = isDetailsLoading && !activePetDetails;

  if (isPetsLoading && !dbPets) {
    return <DashboardLoading />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <View style={styles.headerInner}>
            <DashboardHeader
              pets={pets}
              activePetId={activePetId}
              onSwitchPet={handleSwitchPet}
              onAddPet={() => router.push("/(logged-in)/add-pet")}
              onNotificationsPress={() => {}}
              onProfilePress={() => router.push("/(logged-in)/(tabs)/profile")}
            />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: scrollInsetBottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.petDataBlock}>
            {showDetailsLoader ? (
              <View style={styles.sectionBlock}>
                <SectionLabel style={styles.sectionLabelFlush}>
                  Daily Progress
                </SectionLabel>
                <View style={styles.progressCard}>
                  <View style={styles.petDetailsLoading}>
                    <ActivityIndicator size="large" color={Colors.orange} />
                  </View>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.sectionBlock}>
                  <SectionLabel style={styles.sectionLabelFlush}>
                    Daily Progress
                  </SectionLabel>
                  <View style={styles.progressCard}>
                    <DailyProgress categories={dailyProgress} />
                  </View>
                </View>

                <ActivityFeed
                  activities={[]}
                  date={todayStr}
                  onLogActivityPress={() => {}}
                />

                <HealthSection
                  medications={medications}
                  vetVisits={[]}
                  onScheduleVisitPress={() => {}}
                />
              </>
            )}
          </View>

          <PetManagement
            pets={pets}
            onAddPet={() => router.push("/(logged-in)/add-pet")}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  headerBar: {
    backgroundColor: Colors.cream,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.creamDark,
  },
  headerInner: {
    paddingHorizontal: 20,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 20,
  },
  /** Label + card for daily progress only */
  sectionBlock: {
    gap: 10,
  },
  sectionLabelFlush: {
    marginBottom: 0,
  },
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  petDataBlock: {
    gap: 20,
  },
  petDetailsLoading: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
});
