import Divider from "@/components/ui/Divider";
import PetAboutSection from "@/components/ui/pet/PetAboutSection";
import PetAttributeChips from "@/components/ui/pet/PetAttributeChips";
import PetExerciseSection from "@/components/ui/pet/PetExerciseSection";
import PetFeedingSection from "@/components/ui/pet/PetFeedingSection";
import PetHero, { HERO_HEIGHT } from "@/components/ui/pet/PetHero";
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
import {
  formatDateOfBirth,
  formatEnergyLabel,
  formatMicrochipLabel,
  formatPetAgeDisplay,
  formatPetTypeLabel,
  formatPetWeightDisplay,
} from "@/utils/petDisplay";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CARD_OVERLAP = 32;
/** Max extra height when pulling past the top (rubber-band / overscroll). */
const HERO_STRETCH_MAX = 220;

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

function toExerciseRequirements(details: PetWithDetails): ExerciseRequirements {
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
  const dob = details.date_of_birth;
  const dobFormatted = formatDateOfBirth(
    typeof dob === "string" ? dob : dob != null ? String(dob) : null,
  );

  return {
    id: details.id,
    name: details.name,
    breed: details.breed ?? "",
    imageUrl: details.avatar_url,
    age: details.age ?? 0,
    ageMonths: details.age_months,
    ageDisplay: formatPetAgeDisplay(details),
    weightLbs: details.weight_lbs ?? 0,
    weightUnit: details.weight_unit,
    weightDisplay: formatPetWeightDisplay(details),
    sex: details.sex ?? "male",
    color: details.color ?? "",
    petType: details.pet_type,
    petTypeLabel: formatPetTypeLabel(details.pet_type),
    dateOfBirth:
      typeof dob === "string" ? dob : dob != null ? String(dob) : null,
    dateOfBirthFormatted: dobFormatted,
    energyLevel: details.energy_level,
    energyLevelLabel: formatEnergyLabel(details.energy_level),
    allergies: details.allergies ?? [],
    isMicrochipped: details.is_microchipped ?? null,
    microchipLabel: formatMicrochipLabel(details.is_microchipped ?? null),
    exercisesPerDay: details.exercises_per_day,
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
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const heroStretchStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    const extra = y < 0 ? Math.min(-y, HERO_STRETCH_MAX) : 0;
    return {
      height: HERO_HEIGHT + extra,
      overflow: "hidden",
    };
  });

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
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={1}
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
        contentInsetAdjustmentBehavior={
          Platform.OS === "ios" ? "never" : undefined
        }
        overScrollMode={Platform.OS === "android" ? "always" : undefined}
      >
        <Animated.View style={heroStretchStyle}>
          <PetHero
            imageUrl={profile.imageUrl}
            onBack={() => router.back()}
            onOptions={() => {}}
            style={styles.heroFill}
          />
        </Animated.View>

        <View style={styles.card}>
          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text style={styles.petName} numberOfLines={1}>
                {profile.name}
              </Text>
              <View style={styles.microchippedBlock}>
                {profile.isMicrochipped ? (
                  <>
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={Colors.success}
                    />
                    <Text style={styles.microchippedText}>Microchipped</Text>
                  </>
                ) : null}
              </View>
            </View>
            <Text style={styles.breed}>
              {profile.petType ? `${profile.petTypeLabel} · ` : ""}
              {profile.breed}
            </Text>
          </View>
          <PetAttributeChips profile={profile} />
          <Divider />
          <PetAboutSection about={profile.about} />
          <Divider />

          <Text style={styles.sectionGroupTitle}>Care Requirements</Text>
          <View style={styles.careCards}>
            <PetFeedingSection feeding={profile.feeding} />
            <PetExerciseSection exercise={profile.exercise} />
          </View>

          <Divider />
          <PetMedicationsSection medications={profile.medications} />
        </View>
      </Animated.ScrollView>
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
  /** Fills stretch wrapper; avoids `height: "100%"` which often fails with Reanimated layouts on iOS. */
  heroFill: {
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
    gap: 12,
  },
  petName: {
    flex: 1,
    flexShrink: 1,
    fontFamily: "InstrumentSans-Bold",
    fontSize: 32,
    color: Colors.textPrimary,
    minWidth: 0,
  },
  microchippedBlock: {
    backgroundColor: Colors.successLight,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.success,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  microchippedText: {
    fontFamily: "InstrumentSans-Medium",
    fontSize: 11,
    color: Colors.success,
  },
  breed: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textSecondary,
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
