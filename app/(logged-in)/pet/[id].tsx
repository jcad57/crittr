import PetAttributeChips from "@/components/ui/pet/PetAttributeChips";
import PetHero, { AVATAR_OVERLAP } from "@/components/ui/pet/PetHero";
import { Colors } from "@/constants/colors";
import type {
  FeedingSchedule,
  Medication,
  PetProfile,
} from "@/data/mockDashboard";
import { usePetStore } from "@/stores/petStore";
import type { PetFood, PetWithDetails } from "@/types/database";
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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Data mapping ────────────────────────────────────────────────────────────

function formatPortionLabel(f: PetFood): string {
  const size = f.portion_size?.trim() ?? "";
  const unit = f.portion_unit?.trim() ?? "";
  return [size, unit].filter(Boolean).join(" ") || "—";
}

function toFeedingSchedule(details: PetWithDetails): FeedingSchedule {
  const sorted = [...details.foods].sort((a, b) =>
    a.is_treat === b.is_treat ? 0 : a.is_treat ? 1 : -1,
  );
  return {
    items: sorted.map((f) => ({
      brand: f.brand?.trim() || "Food",
      portionLabel: formatPortionLabel(f),
      isTreat: f.is_treat,
    })),
    notes: "",
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
    medications: toMedications(details),
    vetVisits: [],
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type InfoRowProps = { label: string; value: string };

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}

type MenuItemProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress?: () => void;
  iconBg?: string;
  iconColor?: string;
};

function MenuItem({
  icon,
  label,
  onPress,
  iconBg = Colors.orangeLight,
  iconColor = Colors.orange,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={Colors.gray400}
      />
    </TouchableOpacity>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Pet not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ── Fixed nav bar ──────────────────────────────────── */}
      <View style={[styles.navBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navButton}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={Colors.black}
          />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {profile.name}
        </Text>
        <TouchableOpacity style={styles.navButton} hitSlop={8}>
          <MaterialCommunityIcons
            name="cog-outline"
            size={22}
            color={Colors.black}
          />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ─────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <PetHero imageUrl={profile.imageUrl} />

        {/* Card pulls up to avatar midline; lower z-index so avatar paints on top */}
        <View
          style={[
            styles.card,
            { marginTop: -AVATAR_OVERLAP, paddingTop: AVATAR_OVERLAP + 12 },
          ]}
        >
          <PetAttributeChips profile={profile} />

          {/* ── Info section ─────────────────────────────── */}
          <View style={styles.infoSection}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoTitle}>{profile.name}'s Information</Text>
              <TouchableOpacity hitSlop={8}>
                <Text style={styles.editBtn}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoRows}>
              <InfoRow label="Breed" value={profile.breed} />
              <InfoRow
                label="Sex"
                value={profile.sex === "male" ? "Male" : "Female"}
              />
              {profile.dateOfBirthFormatted && (
                <InfoRow
                  label="Date of birth"
                  value={`${profile.dateOfBirthFormatted} (${profile.ageDisplay})`}
                />
              )}
              {!profile.dateOfBirthFormatted && (
                <InfoRow label="Age" value={profile.ageDisplay} />
              )}
              <InfoRow label="Weight" value={profile.weightDisplay} />
              <InfoRow label="Energy level" value={profile.energyLevelLabel} />
              {profile.allergies.length > 0 && (
                <InfoRow
                  label="Allergies"
                  value={profile.allergies.join(", ")}
                />
              )}
            </View>
          </View>

          {/* ── Menu items ───────────────────────────────── */}
          <View style={styles.menuSection}>
            <MenuItem
              icon="note-text-outline"
              label="About"
              iconBg={Colors.lavenderLight}
              iconColor={Colors.lavenderDark}
            />
            <MenuItem
              icon="food-variant"
              label="Care"
              iconBg={Colors.amberLight}
              iconColor={Colors.amberDark}
            />
            <MenuItem
              icon="pill"
              label="Medications"
              iconBg={Colors.successLight}
              iconColor={Colors.successDark}
            />
            <MenuItem
              icon="file-document-outline"
              label="Medical Records"
              iconBg={Colors.coralLight}
              iconColor={Colors.coral}
            />
            <MenuItem
              icon="shield-check-outline"
              label="Insurance"
              iconBg={Colors.skyLight}
              iconColor={Colors.skyDark}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  centered: {
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

  /* ── Nav bar ─────────────────────────────────────── */
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: Colors.white,
    zIndex: 10,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    fontFamily: "InstrumentSans-Bold",
    fontSize: 20,
    color: Colors.black,
    textAlign: "center",
    marginHorizontal: 12,
  },

  /* ── Scroll ──────────────────────────────────────── */
  scroll: {
    flex: 1,
    overflow: "visible",
  },
  scrollContent: {
    overflow: "visible",
    flexGrow: 1,
  },

  /* ── Card body ───────────────────────────────────── */
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    gap: 20,
    zIndex: 1,
  },

  /* ── Info section ────────────────────────────────── */
  infoSection: {
    gap: 14,
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoTitle: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  editBtn: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.orange,
  },
  infoRows: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  infoLabel: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  infoValue: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "right",
    maxWidth: "55%",
  },

  /* ── Menu section ────────────────────────────────── */
  menuSection: {
    gap: 0,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
});
