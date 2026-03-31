import SectionLabel from "@/components/ui/dashboard/SectionLabel";
import HealthListCard from "@/components/ui/health/HealthListCard";
import MedicationListRow from "@/components/ui/medication/MedicationListRow";
import PetExerciseRequirementsBlock from "@/components/ui/pet/PetExerciseRequirementsBlock";
import PetFoodProfileCard from "@/components/ui/pet/PetFoodProfileCard";
import PetProfileHero, {
  type PetHeroTag,
} from "@/components/ui/pet/PetProfileHero";
import PetStatChips, {
  type StatChipItem,
} from "@/components/ui/pet/PetStatChips";
import RecordsNavCard, {
  type RecordsNavItem,
} from "@/components/ui/pet/RecordsNavCard";
import VaccinationAttentionRow from "@/components/ui/vaccination/VaccinationAttentionRow";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import type {
  FeedingSchedule,
  Medication,
  PetProfile,
} from "@/data/mockDashboard";
import {
  petDetailsQueryKey,
  petsQueryKey,
  usePetDetailsQuery,
  useTodayActivitiesQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { vaccinationNeedsAttention } from "@/lib/healthTraffic";
import { getMedicationBadgeDisplay } from "@/lib/medicationBadgeDisplay";
import { buildMedicationDosageProgress } from "@/lib/medicationDosageProgress";
import { isTreatFood } from "@/lib/petFood";
import { pickAvatarImage } from "@/lib/pickImage";
import { queryClient } from "@/lib/queryClient";
import { updatePetAvatar } from "@/services/pets";
import { useAuthStore } from "@/stores/authStore";
import type {
  PetActivity,
  PetFood,
  PetVaccination,
  PetWithDetails,
} from "@/types/database";
import {
  formatBirthdayChip,
  formatDateOfBirth,
  formatEnergyLabel,
  formatMicrochipLabel,
  formatPetAgeDisplay,
  formatPetTypeLabel,
  formatPetWeightDisplay,
  parseDateOnlyYmd,
} from "@/utils/petDisplay";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const sorted = [...details.foods].sort((a, b) => {
    const ta = isTreatFood(a);
    const tb = isTreatFood(b);
    return ta === tb ? 0 : ta ? 1 : -1;
  });
  return {
    items: sorted.map((f) => ({
      brand: f.brand?.trim() || "Food",
      portionLabel: formatPortionLabel(f),
      isTreat: isTreatFood(f),
      notes: f.notes?.trim() || undefined,
    })),
    notes: "",
  };
}

function toMedications(
  details: PetWithDetails,
  todayActivities: PetActivity[],
): Medication[] {
  return details.medications.map((m) => {
    const prog = buildMedicationDosageProgress(m, todayActivities, details.id);
    const badge = getMedicationBadgeDisplay(m, prog);
    return {
      id: m.id,
      name: m.name,
      frequency: m.frequency ?? "",
      condition: m.condition ?? "",
      dosageDesc: m.dosage ?? "",
      current: prog.current,
      total: prog.total,
      lastTaken: prog.lastTaken,
      badgeKind: badge.kind,
      badgeLabel: badge.label,
    };
  });
}

function buildQuickTags(profile: PetProfile): PetHeroTag[] {
  const t1: PetHeroTag =
    profile.isSterilized === false
      ? { label: "Intact", muted: true }
      : {
          label: profile.sex === "female" ? "Spayed" : "Neutered",
          muted: false,
        };

  const isChipped =
    profile.isMicrochipped === true ||
    (profile.isMicrochipped !== false &&
      Boolean(profile.microchipNumber?.trim()));
  const t2: PetHeroTag = isChipped
    ? { label: "Microchipped", muted: false }
    : { label: "No microchip", muted: true };

  const t3: PetHeroTag =
    profile.isInsured === true
      ? { label: "Insured", muted: false }
      : profile.isInsured === false
        ? { label: "No insurance", muted: true }
        : { label: "Insurance", muted: true };

  return [t1, t2, t3];
}

function profileSubline(profile: PetProfile): string {
  const breed = profile.breed.trim() || "—";
  return `${breed} · ${profile.ageDisplay}`;
}

function toProfile(
  details: PetWithDetails,
  todayActivities: PetActivity[],
): PetProfile {
  const dob = details.date_of_birth;
  const dobYmd = parseDateOnlyYmd(
    typeof dob === "string" ? dob : dob != null ? String(dob) : null,
  );
  const dobFormatted = formatDateOfBirth(dobYmd);

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
    dateOfBirth: dobYmd,
    dateOfBirthFormatted: dobFormatted,
    energyLevel: details.energy_level,
    energyLevelLabel: formatEnergyLabel(details.energy_level),
    allergies: details.allergies ?? [],
    isMicrochipped: details.is_microchipped ?? null,
    microchipLabel: formatMicrochipLabel(details.is_microchipped ?? null),
    microchipNumber: details.microchip_number ?? null,
    primaryVetClinic: details.primary_vet_clinic ?? null,
    primaryVetAddress: details.primary_vet_address ?? null,
    primaryVetName: details.primary_vet_name ?? null,
    isInsured: details.is_insured,
    insuranceProvider: details.insurance_provider ?? null,
    isSterilized: details.is_sterilized ?? null,
    exercisesPerDay: details.exercises_per_day,
    about: details.about ?? "",
    feeding: toFeedingSchedule(details),
    medications: toMedications(details, todayActivities),
    vetVisits: [],
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type InfoRowProps = { label: string; value: string; isLast?: boolean };

function InfoRow({ label, value, isLast }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}

function medicationSubline(m: Medication): string {
  const parts = [m.frequency, m.condition, m.dosageDesc].filter(
    (s) => s && String(s).trim(),
  );
  return parts.length ? parts.join(" · ") : "—";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PetProfilePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const ownerId = useAuthStore((s) => s.session?.user?.id);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { data: details, isLoading } = usePetDetailsQuery(id);

  const sortedFoodsForProfile = useMemo(() => {
    if (!details?.foods) return [];
    return [...details.foods].sort((a, b) => {
      const ta = isTreatFood(a);
      const tb = isTreatFood(b);
      return ta === tb ? 0 : ta ? 1 : -1;
    });
  }, [details?.foods]);

  const attentionVaccinations = useMemo((): PetVaccination[] => {
    if (!details?.vaccinations?.length) return [];
    return details.vaccinations.filter(vaccinationNeedsAttention);
  }, [details?.vaccinations]);

  const { data: todayActivities = [] } = useTodayActivitiesQuery(id);

  const handlePetAvatarPress = useCallback(async () => {
    if (!ownerId || !id) return;
    const uri = await pickAvatarImage();
    if (!uri) return;
    setAvatarUploading(true);
    try {
      await updatePetAvatar(ownerId, id, uri);
      await queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: petsQueryKey(ownerId) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't update photo", msg);
    } finally {
      setAvatarUploading(false);
    }
  }, [ownerId, id]);

  const profile = useMemo(
    () => (details ? toProfile(details, todayActivities) : null),
    [details, todayActivities],
  );

  const statItems = useMemo((): StatChipItem[] => {
    if (!profile) return [];
    const birthday = formatBirthdayChip(profile.dateOfBirth);
    const gender = profile.sex === "female" ? "Female" : "Male";
    return [
      {
        label: "Weight",
        value: profile.weightDisplay,
        icon: "scale-bathroom",
      },
      {
        label: "Birthday",
        value: birthday,
        icon: "calendar-month-outline",
      },
      {
        label: "Gender",
        value: gender,
        icon: "gender-male-female",
      },
    ];
  }, [profile]);

  const recordsItems = useMemo((): RecordsNavItem[] => {
    if (!profile) return [];
    const insSub =
      profile.isInsured && profile.insuranceProvider?.trim()
        ? `${profile.insuranceProvider.trim()} · Active`
        : profile.isInsured
          ? "Active"
          : "Not set";
    const chipSub = profile.microchipNumber?.trim()
      ? `${profile.microchipNumber.trim()} · on file`
      : "Add microchip number and registry info";
    return [
      {
        id: "medical",
        title: "Medical records",
        subtitle: "Visits, vaccinations, labs",
        icon: "clipboard-check-outline",
        iconBg: Colors.orangeLight,
        iconColor: Colors.orange,
        onPress: () =>
          router.push(`/(logged-in)/pet/${profile.id}/medical-records` as Href),
      },
      {
        id: "vaccinations",
        title: "Vaccinations",
        subtitle: "View and add shots",
        icon: "calendar-month",
        iconBg: Colors.mintLight,
        iconColor: Colors.successDark,
        onPress: () =>
          router.push(`/(logged-in)/pet/${profile.id}/vaccinations` as Href),
      },
      {
        id: "microchip",
        title: "Microchip details",
        subtitle: chipSub,
        icon: "cellphone-nfc",
        iconBg: Colors.skyLight,
        iconColor: Colors.skyDark,
        onPress: () => router.push(`/pet/${profile.id}/microchip`),
      },
      {
        id: "insurance",
        title: "Insurance",
        subtitle: insSub,
        icon: "shield-check",
        iconBg: Colors.lavenderLight,
        iconColor: Colors.lavenderDark,
      },
      {
        id: "activity",
        title: "Activity history",
        subtitle: "Walks, meals, treats",
        icon: "clock-outline",
        iconBg: Colors.amberLight,
        iconColor: Colors.amberDark,
        onPress: () =>
          router.push(
            `/(logged-in)/activity?petId=${encodeURIComponent(profile.id)}` as Href,
          ),
      },
    ];
  }, [profile, router]);

  const manageItems = useMemo((): RecordsNavItem[] => {
    if (!profile) return [];
    const petName = profile.name?.trim() || "your pet";
    return [
      {
        id: "visibility",
        title: "Visibility",
        subtitle: "Memorial, delete, and how this pet appears",
        icon: "eye-outline",
        iconBg: Colors.orangeLight,
        iconColor: Colors.orange,
        onPress: () =>
          router.push(`/(logged-in)/pet/${profile.id}/visibility` as Href),
      },
      {
        id: "invite",
        title: `Invite someone to care for ${petName}`,
        subtitle: "Email a co-carer (coming soon)",
        icon: "account-heart-outline",
        iconBg: Colors.lavenderLight,
        iconColor: Colors.lavenderDark,
        onPress: () =>
          router.push(`/(logged-in)/pet/${profile.id}/invite-care` as Href),
      },
    ];
  }, [profile, router]);

  if (isLoading) {
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

  const tags = buildQuickTags(profile);

  return (
    <View style={styles.screen}>
      <View style={[styles.navBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navBack}
          hitSlop={8}
        >
          <Text style={styles.navBackText}>&lt; Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {profile.name}
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollInsetBottom },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <PetProfileHero
          name={profile.name}
          subline={profileSubline(profile)}
          imageUrl={profile.imageUrl}
          tags={tags}
          onAvatarPress={handlePetAvatarPress}
          avatarUploading={avatarUploading}
        />

        <PetStatChips items={statItems} />

        <View style={styles.sectionHeaderRow}>
          <SectionLabel style={styles.sectionLabelInline}>Details</SectionLabel>
          <TouchableOpacity
            hitSlop={8}
            onPress={() =>
              router.push(`/(logged-in)/pet/${profile.id}/edit-details` as Href)
            }
          >
            <Text style={styles.sectionEditLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.detailsCard}>
          <InfoRow label="Breed" value={profile.breed} />
          <InfoRow label="Color" value={profile.color} />
          <InfoRow
            label="Vet clinic"
            value={profile.primaryVetClinic?.trim() || "—"}
          />
          <InfoRow
            label="Vet address"
            value={profile.primaryVetAddress?.trim() || "—"}
            isLast
          />
        </View>

        {details ? <PetExerciseRequirementsBlock details={details} /> : null}

        <View style={styles.sectionHeaderRow}>
          <SectionLabel style={styles.sectionLabelInline}>Food</SectionLabel>
          <TouchableOpacity
            onPress={() =>
              router.push(`/(logged-in)/pet/${profile.id}/food` as Href)
            }
            hitSlop={8}
          >
            <Text style={styles.sectionEditLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        {sortedFoodsForProfile.length > 0 ? (
          <View style={styles.medList}>
            {sortedFoodsForProfile.map((f) => (
              <TouchableOpacity
                key={f.id}
                activeOpacity={0.85}
                onPress={() =>
                  router.push(
                    `/(logged-in)/pet/${profile.id}/food/${f.id}` as Href,
                  )
                }
              >
                <PetFoodProfileCard
                  name={f.brand?.trim() || "Food"}
                  subline={formatPortionLabel(f)}
                  isTreat={isTreatFood(f)}
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyMed}>No foods recorded.</Text>
        )}

        <View style={styles.sectionHeaderRow}>
          <SectionLabel style={styles.sectionLabelInline}>
            Active medications
          </SectionLabel>
          <TouchableOpacity
            onPress={() =>
              router.push(`/(logged-in)/pet/${profile.id}/medications` as Href)
            }
            hitSlop={8}
          >
            <Text style={styles.sectionEditLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        {profile.medications.length > 0 ? (
          <HealthListCard>
            {profile.medications.map((m, i) => (
              <MedicationListRow
                key={m.id}
                title={m.name}
                subline={medicationSubline(m)}
                badgeKind={m.badgeKind}
                badgeLabel={m.badgeLabel}
                isLast={i === profile.medications.length - 1}
                onPress={() =>
                  router.push(
                    `/(logged-in)/pet/${profile.id}/medications/${m.id}` as Href,
                  )
                }
              />
            ))}
          </HealthListCard>
        ) : (
          <Text style={styles.emptyMed}>No medications recorded.</Text>
        )}

        {attentionVaccinations.length > 0 ? (
          <>
            <SectionLabel style={styles.sectionLabelInline}>
              Vaccinations
            </SectionLabel>
            <HealthListCard>
              {attentionVaccinations.map((v, i) => (
                <VaccinationAttentionRow
                  key={v.id}
                  vaccination={v}
                  isLast={i === attentionVaccinations.length - 1}
                  onPress={() => router.push("/(logged-in)/health" as Href)}
                />
              ))}
            </HealthListCard>
          </>
        ) : null}

        <SectionLabel style={styles.sectionFlush}>Records</SectionLabel>
        <RecordsNavCard items={recordsItems} />

        <SectionLabel style={styles.sectionFlush}>Manage pet</SectionLabel>
        <RecordsNavCard items={manageItems} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cream,
  },
  notFoundText: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
  },

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.cream,
  },
  navBack: {
    minWidth: 72,
  },
  navBackText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  /** Balances the back control so the title stays centered. */
  navSpacer: {
    minWidth: 72,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 4,
  },
  sectionFlush: {
    marginBottom: 0,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 0,
    width: "100%",
  },
  sectionLabelInline: {
    marginBottom: 0,
    flexShrink: 1,
  },
  sectionEditLink: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },

  detailsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.sectionLabel,
  },
  infoValue: {
    fontFamily: Font.uiMedium,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: "right",
    maxWidth: "58%",
  },

  medList: {
    gap: 10,
  },
  emptyMed: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    textAlign: "center",
    color: Colors.gray500,
    paddingVertical: 4,
  },
});
