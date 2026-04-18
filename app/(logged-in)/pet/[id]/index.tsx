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
import {
  petDetailsQueryKey,
  petsQueryKey,
  useLeaveCoCare,
  usePetDetailsQuery,
  useTodayActivitiesQuery,
} from "@/hooks/queries";
import { useCanPerformAction, usePetRole } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { vaccinationNeedsAttention } from "@/lib/healthTraffic";
import { getMedicationBadgeDisplay } from "@/lib/medicationBadgeDisplay";
import { buildMedicationDosageProgress } from "@/lib/medicationDosageProgress";
import { formatPetFoodPortionSubline, isTreatFood } from "@/lib/petFood";
import { pickAvatarImage } from "@/lib/pickImage";
import { queryClient } from "@/lib/queryClient";
import { updatePetAvatar } from "@/services/pets";
import { useAuthStore } from "@/stores/authStore";
import type {
  PetActivity,
  PetVaccination,
  PetWithDetails,
} from "@/types/database";
import type {
  FeedingSchedule,
  MedicationSummary,
  PetProfile,
} from "@/types/ui";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Pet profile Records / Manage rows — matches food-section PNG sizing via `RecordsNavCard`. */
const PET_PROFILE_RECORD_ICONS = {
  medicalRecords: require("@/assets/icons/medical-records-icon.png"),
  calendar: require("@/assets/icons/calendar-icon.png"),
  microchip: require("@/assets/icons/microchip-icon.png"),
  insurance: require("@/assets/icons/insurance-icon.png"),
  activity: require("@/assets/icons/pet-walk-icon.png"),
  visibility: require("@/assets/icons/visibility-icon.png"),
  coCare: require("@/assets/icons/co-care-icon.png"),
} as const;

// ─── Data mapping ────────────────────────────────────────────────────────────

function toFeedingSchedule(details: PetWithDetails): FeedingSchedule {
  const sorted = [...details.foods].sort((a, b) => {
    const ta = isTreatFood(a);
    const tb = isTreatFood(b);
    return ta === tb ? 0 : ta ? 1 : -1;
  });
  return {
    items: sorted.map((f) => ({
      brand: f.brand?.trim() || "Food",
      portionLabel: formatPetFoodPortionSubline(f),
      isTreat: isTreatFood(f),
      notes: f.notes?.trim() || undefined,
    })),
    notes: "",
  };
}

function toMedications(
  details: PetWithDetails,
  todayActivities: PetActivity[],
): MedicationSummary[] {
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
    insurancePolicyNumber: details.insurance_policy_number ?? null,
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

function medicationSubline(m: MedicationSummary): string {
  const parts = [m.frequency, m.condition, m.dosageDesc].filter(
    (s) => s && String(s).trim(),
  );
  return parts.length ? parts.join(" · ") : "—";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PetProfilePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { push, replace, router } = useNavigationCooldown();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const ownerId = useAuthStore((s) => s.session?.user?.id);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { data: details, isLoading } = usePetDetailsQuery(id);

  const { isOwner, isCoCarer, isLoading: roleLoading } = usePetRole(id);
  const leaveCoCareMut = useLeaveCoCare(id ?? "");
  const canEditProfile = useCanPerformAction(id, "can_edit_pet_profile");
  const canManageFood = useCanPerformAction(id, "can_manage_food");
  const canManageMeds = useCanPerformAction(id, "can_manage_medications");
  const { runWithProOrUpgrade } = useProGateNavigation();

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

  const handleLeaveCoCare = useCallback(() => {
    if (!id || !profile) return;
    const petName = profile.name?.trim() || "this pet";
    Alert.alert(
      "Remove yourself as co-carer?",
      `You will lose access to ${petName}'s profile and activities for this pet. The primary caretaker can invite you again later if needed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            leaveCoCareMut.mutate(undefined, {
              onSuccess: () => {
                replace("/(logged-in)/dashboard" as Href);
              },
              onError: (e) =>
                Alert.alert(
                  "Could not leave",
                  e instanceof Error ? e.message : "Something went wrong.",
                ),
            }),
        },
      ],
    );
  }, [id, profile, leaveCoCareMut, replace]);

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
    const insSub = (() => {
      if (profile.isInsured === true) {
        const co = profile.insuranceProvider?.trim();
        const pol = profile.insurancePolicyNumber?.trim();
        if (co && pol) return `${co} · #${pol}`;
        if (co) return co;
        if (pol) return `Policy #${pol}`;
        return "On file";
      }
      if (profile.isInsured === false) return "No insurance";
      return "Not set";
    })();
    const chipSub = profile.microchipNumber?.trim()
      ? `ID: ${profile.microchipNumber.trim()}`
      : "Add microchip number and registry info";
    return [
      {
        id: "medical",
        title: "Medical records",
        subtitle: "Upload and view medical records",
        iconImage: PET_PROFILE_RECORD_ICONS.medicalRecords,
        iconBg: Colors.orangeLight,
        onPress: () =>
          push(`/(logged-in)/pet/${profile.id}/medical-records` as Href),
      },
      {
        id: "vaccinations",
        title: "Vaccinations",
        subtitle: "Add your pet's vaccination history",
        iconImage: PET_PROFILE_RECORD_ICONS.calendar,
        iconBg: Colors.mintLight,
        onPress: () =>
          push(`/(logged-in)/pet/${profile.id}/vaccinations` as Href),
      },
      {
        id: "microchip",
        title: "Microchip details",
        subtitle: chipSub,
        iconImage: PET_PROFILE_RECORD_ICONS.microchip,
        iconBg: Colors.skyLight,
        onPress: () => push(`/pet/${profile.id}/microchip`),
      },
      {
        id: "insurance",
        title: "Insurance",
        subtitle: "Add or view insurance details",
        iconImage: PET_PROFILE_RECORD_ICONS.insurance,
        iconBg: Colors.lavenderLight,
        onPress: () => push(`/(logged-in)/pet/${profile.id}/insurance` as Href),
      },
      {
        id: "activity",
        title: "Activity history",
        subtitle: `View ${profile.name}'s activity history`,
        iconImage: PET_PROFILE_RECORD_ICONS.activity,
        iconBg: Colors.amberLight,
        onPress: () =>
          push(`/(logged-in)/pet/${profile.id}/activity-log` as Href),
      },
    ];
  }, [profile, push]);

  const manageItems = useMemo((): RecordsNavItem[] => {
    if (!profile || roleLoading) return [];
    const petName = profile.name?.trim() || "your pet";
    const items: RecordsNavItem[] = [];

    if (isOwner) {
      items.push({
        id: "visibility",
        title: "Visibility",
        subtitle: "Memorialize or delete a pet permanently",
        iconImage: PET_PROFILE_RECORD_ICONS.visibility,
        iconBg: Colors.orangeLight,
        onPress: () =>
          push(`/(logged-in)/pet/${profile.id}/visibility` as Href),
      });
      items.push({
        id: "invite",
        title: `Co-carers for ${petName}`,
        subtitle: "Manage co-carers and permissions",
        iconImage: PET_PROFILE_RECORD_ICONS.coCare,
        iconBg: Colors.lavenderLight,
        onPress: () =>
          runWithProOrUpgrade(() =>
            push(`/(logged-in)/pet/${profile.id}/invite-care` as Href),
          ),
      });
    } else if (isCoCarer) {
      items.push({
        id: "leave-co-care",
        title: "Remove yourself as a co-carer",
        subtitle: `Stop co-caring for ${petName}`,
        icon: "account-remove-outline",
        iconBg: Colors.white,
        iconColor: Colors.error,
        onPress: handleLeaveCoCare,
        showChevron: false,
        variant: "destructive",
      });
    }

    return items;
  }, [
    profile,
    push,
    isOwner,
    isCoCarer,
    roleLoading,
    handleLeaveCoCare,
    runWithProOrUpgrade,
  ]);

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
        <Pressable
          onPress={() => router.back()}
          style={styles.navBack}
          hitSlop={8}
        >
          <Text style={styles.navBackText}>&lt; Back</Text>
        </Pressable>
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
        {isCoCarer && (
          <View style={styles.coCarerBanner}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={16}
              color={Colors.lavenderDark}
            />
            <Text style={styles.coCarerBannerText}>
              You are co-caring for this pet
            </Text>
          </View>
        )}

        <PetProfileHero
          name={profile.name}
          subline={profileSubline(profile)}
          imageUrl={profile.imageUrl}
          tags={tags}
          onAvatarPress={canEditProfile ? handlePetAvatarPress : undefined}
          avatarUploading={avatarUploading}
          onEditNamePress={
            canEditProfile
              ? () =>
                  push(`/(logged-in)/pet/${profile.id}/edit-name-breed` as Href)
              : undefined
          }
        />

        <PetStatChips items={statItems} />

        <View style={styles.sectionHeaderRow}>
          <SectionLabel style={styles.sectionLabelInline}>Details</SectionLabel>
          {canEditProfile && (
            <Pressable
              hitSlop={8}
              onPress={() =>
                push(`/(logged-in)/pet/${profile.id}/edit-details` as Href)
              }
            >
              <Text style={styles.sectionEditLink}>Edit</Text>
            </Pressable>
          )}
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

        {details ? (
          <PetExerciseRequirementsBlock
            details={details}
            canEdit={canEditProfile === true}
          />
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <SectionLabel style={styles.sectionLabelInline}>Food</SectionLabel>
          {canManageFood && (
            <Pressable
              onPress={() =>
                push(`/(logged-in)/pet/${profile.id}/food` as Href)
              }
              hitSlop={8}
            >
              <Text style={styles.sectionEditLink}>Edit</Text>
            </Pressable>
          )}
        </View>
        {sortedFoodsForProfile.length > 0 ? (
          <View style={styles.medList}>
            {sortedFoodsForProfile.map((f) => (
              <TouchableOpacity
                key={f.id}
                activeOpacity={0.85}
                onPress={() =>
                  push(`/(logged-in)/pet/${profile.id}/food/${f.id}` as Href)
                }
              >
                <PetFoodProfileCard
                  name={f.brand?.trim() || "Food"}
                  subline={formatPetFoodPortionSubline(f)}
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
          {canManageMeds && (
            <Pressable
              onPress={() =>
                push(`/(logged-in)/pet/${profile.id}/medications` as Href)
              }
              hitSlop={8}
            >
              <Text style={styles.sectionEditLink}>Edit</Text>
            </Pressable>
          )}
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
                  push(
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
                  onPress={() => push("/(logged-in)/health" as Href)}
                />
              ))}
            </HealthListCard>
          </>
        ) : null}

        <SectionLabel style={styles.sectionFlush}>Records</SectionLabel>
        <RecordsNavCard items={recordsItems} />

        {manageItems.length > 0 ? (
          <>
            <SectionLabel style={styles.sectionFlush}>Manage pet</SectionLabel>
            <RecordsNavCard items={manageItems} />
          </>
        ) : null}
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
  coCarerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.lavenderLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  coCarerBannerText: {
    fontFamily: Font.uiMedium,
    fontSize: 13,
    color: Colors.lavenderDark,
  },
});
