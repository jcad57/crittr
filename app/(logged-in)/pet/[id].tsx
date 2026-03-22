import PetAboutSection from "@/components/ui/pet/PetAboutSection";
import PetAttributeChips from "@/components/ui/pet/PetAttributeChips";
import PetExerciseSection from "@/components/ui/pet/PetExerciseSection";
import PetFeedingSection from "@/components/ui/pet/PetFeedingSection";
import PetHeroPlaceholder, { HERO_HEIGHT } from "@/components/ui/pet/PetHeroPlaceholder";
import PetMedicationsSection from "@/components/ui/pet/PetMedicationsSection";
import { Colors } from "@/constants/colors";
import { MOCK_PET_PROFILES } from "@/data/mockDashboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// How far the white content card overlaps the hero
const CARD_OVERLAP = 32;

export default function PetProfilePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const profile = MOCK_PET_PROFILES[id ?? ""];

  if (!profile) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Pet not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <PetHeroPlaceholder
          onBack={() => router.back()}
          onOptions={() => {}}
        />

        {/* ── Content card — overlaps the hero ──────────────────────── */}
        <View style={styles.card}>
          {/* Identity */}
          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text style={styles.petName}>{profile.name}</Text>
            </View>
            <Text style={styles.breed}>{profile.breed}</Text>
          </View>

          <View style={styles.divider} />

          {/* Attribute chips */}
          <PetAttributeChips profile={profile} />

          <View style={styles.divider} />

          {/* About */}
          <PetAboutSection about={profile.about} />

          <View style={styles.divider} />

          {/* Care requirements */}
          <Text style={styles.sectionGroupTitle}>Care Requirements</Text>
          <View style={styles.careCards}>
            <PetFeedingSection feeding={profile.feeding} />
            <PetExerciseSection exercise={profile.exercise} />
          </View>

          <View style={styles.divider} />

          {/* Medications */}
          <PetMedicationsSection medications={profile.medications} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.orange,
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
    minHeight: 600,
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
