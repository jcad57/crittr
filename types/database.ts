// ─── Row types (mirror Supabase tables) ─────────────────────────────────────

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
};

export type Pet = {
  id: string;
  owner_id: string;
  name: string;
  breed: string | null;
  age: number | null;
  weight_lbs: number | null;
  sex: "male" | "female" | null;
  color: string | null;
  about: string | null;
  energy_level: "low" | "medium" | "high" | null;
  allergies: string[];
  avatar_url: string | null;
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
  displayName: string;
  bio: string;
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
  dosage: string;
  frequency: string;
  condition: string;
};

export type PetFormData = {
  name: string;
  breed: string;
  age: string;
  weightLbs: string;
  sex: "male" | "female" | "";
  color: string;
  about: string;
  energyLevel: "low" | "medium" | "high" | "";
  allergies: string;
  avatarUri: string | null;
  foods: FoodFormEntry[];
  medications: MedicationFormEntry[];
  coCarerEmail: string;
};

export const EMPTY_PET_FORM: PetFormData = {
  name: "",
  breed: "",
  age: "",
  weightLbs: "",
  sex: "",
  color: "",
  about: "",
  energyLevel: "",
  allergies: "",
  avatarUri: null,
  foods: [],
  medications: [],
  coCarerEmail: "",
};
