import { getMedicationBadgeDisplay } from "@/utils/medicationBadgeDisplay";
import { buildMedicationDosageProgress } from "@/utils/medicationDosageProgress";
import { formatPetFoodPortionSubline, isTreatFood } from "@/utils/petFood";
import type { PetHeroTag } from "@/components/ui/pet/PetProfileHero";
import type { PetActivity, PetWithDetails } from "@/types/database";
import type {
  FeedingSchedule,
  MedicationSummary,
  PetProfile,
} from "@/types/ui";
import {
  formatDateOfBirth,
  formatEnergyLabel,
  formatMicrochipLabel,
  formatPetAgeDisplay,
  formatPetTypeLabel,
  formatPetWeightDisplay,
  parseDateOnlyYmd,
} from "@/utils/petDisplay";

// ─── Data mapping ────────────────────────────────────────────────────────────

export function toFeedingSchedule(details: PetWithDetails): FeedingSchedule {
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

export function toMedications(
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

export function buildQuickTags(profile: PetProfile): PetHeroTag[] {
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

export function profileSubline(profile: PetProfile): string {
  const breed = profile.breed.trim() || "—";
  return `${breed} · ${profile.ageDisplay}`;
}

export function toProfile(
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

export function medicationSubline(m: MedicationSummary): string {
  const parts = [m.frequency, m.condition, m.dosageDesc].filter(
    (s) => s && String(s).trim(),
  );
  return parts.length ? parts.join(" · ") : "—";
}
