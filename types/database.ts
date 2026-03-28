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
  mealsPerDay: string;
  isTreat: boolean;
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
