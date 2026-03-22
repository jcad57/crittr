import PetAboutSection from "@/components/ui/pet/PetAboutSection";
import PetAttributeChips from "@/components/ui/pet/PetAttributeChips";
import PetExerciseSection from "@/components/ui/pet/PetExerciseSection";
import PetFeedingSection from "@/components/ui/pet/PetFeedingSection";
import PetHeroPlaceholder from "@/components/ui/pet/PetHeroPlaceholder";
import PetMedicationsSection from "@/components/ui/pet/PetMedicationsSection";
import { Colors } from "@/constants/colors";
import type {
  ExerciseRequirements,
  FeedingSchedule,
  Medication,
  PetProfile,
} from "@/data/mockDashboard";
import { usePetStore } from "@/stores/petStore";
import type { PetWithDetails } from "@/types/database";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CARD_OVERLAP = 32;

function toFeedingSchedule(details: PetWithDetails): FeedingSchedule {
  const primary = details.foods.find((f) => !f.is_treat);
  return {
    mealsPerDay: primary?.meals_per_day ?? 2,
    portionSize: primary?.portion_size ?? "",
    foodBrand: primary?.brand ?? "",
    feedingTimes: [],
    notes: "",
  };
}

function toExerciseRequirements(
  details: PetWithDetails,
): ExerciseRequirements {
  return {
    walksPerDay: details.exercise?.walks_per_day ?? 0,
    walkDurationMinutes: details.exercise?.walk_duration_minutes ?? 0,
    activities: details.exercise?.activities ?? [],
  };
}

function toMedications(details: PetWithDetails): Medication[] {
  return details.medications.map((m) => ({
    id: m.id,
    name: m.name,
    frequency: m.frequency ?? "",
    condition: m.condition ?? "",
    dosageDesc: m.dosage ?? "",
    current: 0,
    total: 0,
    iconBg: Colors.successLight,
    iconColor: Colors.success,
  }));
}

function toProfile(details: PetWithDetails): PetProfile {
  return {
    id: details.id,
    name: details.name,
    breed: details.breed ?? "",
    imageUrl: details.avatar_url,
    age: details.age ?? 0,
    weightLbs: details.weight_lbs ?? 0,
    sex: details.sex ?? "male",
    color: details.color ?? "",
    about: details.about ?? "",
    feeding: toFeedingSchedule(details),
    exercise: toExerciseRequirements(details),
    medications: toMedications(details),
    vetVisits: [],
  };
}

export default function PetProfilePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fetchPetProfile = usePetStore((s) => s.fetchPetProfile);
  const [details, setDetails] = useState<PetWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchPetProfile(id)
      .then((data) => setDetails(data))
      .finally(() => setLoading(false));
  }, [id, fetchPetProfile]);

  const profile = useMemo(
    () => (details ? toProfile(details) : null),
    [details],
  );

  if (loading) {
    return (
      <View style={[styles.notFound]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Pet not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <PetHeroPlaceholder onBack={() => router.back()} onOptions={() => {}} />

        <View style={styles.card}>
          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text style={styles.petName}>{profile.name}</Text>
            </View>
            <Text style={styles.breed}>{profile.breed}</Text>
          </View>

          <View style={styles.divider} />
          <PetAttributeChips profile={profile} />
          <View style={styles.divider} />
          <PetAboutSection about={profile.about} />
          <View style={styles.divider} />

          <Text style={styles.sectionGroupTitle}>Care Requirements</Text>
          <View style={styles.careCards}>
            <PetFeedingSection feeding={profile.feeding} />
            <PetExerciseSection exercise={profile.exercise} />
          </View>

          <View style={styles.divider} />
          <PetMedicationsSection medications={profile.medications} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  notFoundText: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  card: {
    marginTop: -CARD_OVERLAP,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 20,
  },
  identity: {
    gap: 4,
    marginTop: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  petName: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 28,
    color: Colors.textPrimary,
  },
  breed: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray100,
  },
  sectionGroupTitle: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: -8,
  },
  careCards: {
    gap: 12,
  },
});
