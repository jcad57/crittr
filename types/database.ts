// ─── Pet type ────────────────────────────────────────────────────────────────

export type PetType = "dog" | "cat" | "fish" | "bird" | "reptile" | "other";

// ─── Reference data rows ────────────────────────────────────────────────────

export type Breed = {
  id: string;
  pet_type: string;
  name: string;
};

export type CommonAllergy = {
  id: string;
  pet_type: string;
  name: string;
};

// ─── Row types (mirror Supabase tables) ─────────────────────────────────────

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  bio: string | null;
  home_address: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
};

export type Pet = {
  id: string;
  owner_id: string;
  pet_type: PetType | null;
  name: string;
  breed: string | null;
  age: number | null;
  age_months: number | null;
  date_of_birth: string | null;
  weight_lbs: number | null;
  weight_unit: "lbs" | "kg" | null;
  sex: "male" | "female" | null;
  color: string | null;
  about: string | null;
  energy_level: "low" | "medium" | "high" | null;
  exercises_per_day: number | null;
  allergies: string[];
  avatar_url: string | null;
  is_microchipped: boolean | null;
  microchip_number?: string | null;
  primary_vet_clinic?: string | null;
  primary_vet_address?: string | null;
  primary_vet_name?: string | null;
  is_insured?: boolean | null;
  insurance_provider?: string | null;
  is_sterilized?: boolean | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PetFood = {
  id: string;
  pet_id: string;
  brand: string;
  portion_size: string | null;
  portion_unit: string | null;
  meals_per_day: number | null;
  is_treat: boolean;
  /** Optional feeding notes (e.g. portion split across meals). */
  notes?: string | null;
  created_at: string;
};

export type PetMedication = {
  id: string;
  pet_id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  condition: string | null;
  notes: string | null;
  /** When set, drives due badges on the Health hub. */
  next_due_date?: string | null;
  created_at: string;
};

export type PetVaccination = {
  id: string;
  pet_id: string;
  name: string;
  expires_on: string | null;
  frequency_label: string | null;
  notes: string | null;
  created_at: string;
};

export type PetVetVisit = {
  id: string;
  pet_id: string;
  title: string;
  visit_at: string;
  notes: string | null;
  created_at: string;
};

export type PetWeightEntry = {
  id: string;
  pet_id: string;
  recorded_at: string;
  weight_lbs: number;
  weight_unit: "lbs" | "kg";
  created_at: string;
};

export type PetExercise = {
  id: string;
  pet_id: string;
  walks_per_day: number | null;
  walk_duration_minutes: number | null;
  activities: string[];
  created_at: string;
};

export type CoCarerInvite = {
  id: string;
  pet_id: string | null;
  invited_by: string;
  email: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

// ─── Pet Activity (unified activity log) ────────────────────────────────────

export type ActivityType = "exercise" | "food" | "medication" | "vet_visit";

export type PetActivity = {
  id: string;
  pet_id: string;
  logged_by: string | null;
  activity_type: ActivityType;
  label: string;
  logged_at: string;

  exercise_type: string | null;
  duration_hours: number | null;
  duration_minutes: number | null;
  distance_miles: number | null;
  location: string | null;

  is_treat: boolean | null;
  food_id: string | null;
  /** When food_id is null, ad-hoc food/treat name from the user. */
  food_custom_name?: string | null;
  food_amount: number | null;
  food_unit: string | null;

  medication_id: string | null;
  med_amount: number | null;
  med_unit: string | null;

  vet_location: string | null;
  other_pet_ids: string[] | null;

  notes: string | null;
  created_at: string;
};

// ─── Activity form data (for the add-activity flow) ─────────────────────────

export type ExerciseFormData = {
  label: string;
  exerciseType: string;
  customExerciseType: string;
  durationHours: string;
  durationMinutes: string;
  distanceMiles: string;
  location: string;
  notes: string;
};

/** Sentinel for Food activity: user chose a food not in their pet profile. */
export const FOOD_ACTIVITY_OTHER_ID = "__other__" as const;

export type FoodActivityFormData = {
  label: string;
  isTreat: boolean;
  /** Pet food row id, or `FOOD_ACTIVITY_OTHER_ID` for a custom name. */
  foodId: string;
  /** Profile food brand label, or custom name when `foodId` is other. */
  foodBrand: string;
  amount: string;
  unit: string;
  notes: string;
};

export type MedicationActivityFormData = {
  medicationId: string;
  medicationName: string;
  amount: string;
  unit: string;
  notes: string;
};

export type VetVisitActivityFormData = {
  label: string;
  vetLocation: string;
  customVetLocation: string;
  otherPetIds: string[];
  notes: string;
};

// ─── Composite types (used by UI) ───────────────────────────────────────────

export type PetWithDetails = Pet & {
  foods: PetFood[];
  medications: PetMedication[];
  exercise: PetExercise | null;
};

// ─── Onboarding form types ──────────────────────────────────────────────────

export type AccountFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type ProfileFormData = {
  bio: string;
  homeAddress: string;
  phoneNumber: string;
  avatarUri: string | null;
};

export type FoodFormEntry = {
  localId: string;
  brand: string;
  portionSize: string;
  portionUnit: string;
  /** Times per day to serve this meal or treat (drives daily progress 0/N). */
  mealsPerDay: string;
  isTreat: boolean;
  notes: string;
};

export type MedicationFormEntry = {
  localId: string;
  name: string;
  dosageAmount: string;
  dosageType: string;
  frequency: string;
  customFrequency: string;
  condition: string;
};

export type PetFormData = {
  petType: PetType | "";
  name: string;
  breed: string;
  ageYears: string;
  ageMonths: string;
  dateOfBirth: string;
  weight: string;
  weightUnit: "lbs" | "kg";
  sex: "male" | "female" | "";
  color: string;
  about: string;
  energyLevel: "low" | "medium" | "high" | "";
  exercisesPerDay: string;
  allergies: string[];
  avatarUri: string | null;
  foods: FoodFormEntry[];
  medications: MedicationFormEntry[];
  coCarerEmail: string;
  /** null = prefer not to say */
  isMicrochipped: boolean | null;
  /** ISO / registry number when known */
  microchipNumber: string;
  /** null = unknown; true = spayed/neutered; false = intact */
  isSterilized: boolean | null;
  primaryVetClinic: string;
  primaryVetAddress: string;
  /** null = unknown; true = insured; false = not insured */
  isInsured: boolean | null;
  insuranceProvider: string;
};

export const EMPTY_PET_FORM: PetFormData = {
  petType: "",
  name: "",
  breed: "",
  ageYears: "",
  ageMonths: "",
  dateOfBirth: "",
  weight: "",
  weightUnit: "lbs",
  sex: "",
  color: "",
  about: "",
  energyLevel: "",
  exercisesPerDay: "",
  allergies: [],
  avatarUri: null,
  foods: [],
  medications: [],
  coCarerEmail: "",
  isMicrochipped: null,
  microchipNumber: "",
  isSterilized: null,
  primaryVetClinic: "",
  primaryVetAddress: "",
  isInsured: null,
  insuranceProvider: "",
};
