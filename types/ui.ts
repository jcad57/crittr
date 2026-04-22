import type { HealthTrafficKind } from "@/utils/healthTraffic";

// ─── Presentation types for UI components ────────────────────────────────────

export type PetSummary = {
  id: string;
  name: string;
  breed: string;
  imageUrl: string | null;
};

export type FeedingFoodItem = {
  brand: string;
  portionLabel: string;
  isTreat: boolean;
  notes?: string;
};

export type FeedingSchedule = {
  items: FeedingFoodItem[];
  notes: string;
};

export type PetProfile = PetSummary & {
  age: number;
  ageMonths: number | null;
  ageDisplay: string;
  weightLbs: number;
  weightUnit: "lbs" | "kg" | null;
  weightDisplay: string;
  sex: "male" | "female";
  color: string;
  petType: string | null;
  petTypeLabel: string;
  dateOfBirth: string | null;
  dateOfBirthFormatted: string | null;
  energyLevel: "low" | "medium" | "high" | null;
  energyLevelLabel: string;
  allergies: string[];
  isMicrochipped: boolean | null;
  microchipLabel: string;
  microchipNumber?: string | null;
  primaryVetClinic?: string | null;
  primaryVetAddress?: string | null;
  primaryVetName?: string | null;
  isInsured?: boolean | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  isSterilized?: boolean | null;
  exercisesPerDay: number | null;
  about: string;
  feeding: FeedingSchedule;
  medications: MedicationSummary[];
  vetVisits: VetVisitSummary[];
};

export type AlertData = {
  id: string;
  petName: string;
  message: string;
};

export type DailyProgressCategory = {
  id: string;
  label: string;
  icon: string;
  current: number;
  total: number;
  ringColor: string;
  trackColor: string;
};

export type TextSegment = {
  text: string;
  bold?: boolean;
};

export type ActivityCategory = "exercise" | "meals" | "treats" | "meds";

export type ActivityEntry = {
  id: string;
  hour: number;
  category: ActivityCategory;
  segments: TextSegment[];
  loggedBy: string;
};

export type MedicationSummary = {
  id: string;
  name: string;
  frequency: string;
  condition: string;
  dosageDesc: string;
  current: number;
  total: number;
  lastTaken?: string;
  badgeKind: HealthTrafficKind;
  badgeLabel: string;
};

export type VetVisitSummary = {
  id: string;
  title: string;
  date: string;
  time: string;
  accentColor: string;
  subtitle?: string;
  badgeLabel?: string;
};
