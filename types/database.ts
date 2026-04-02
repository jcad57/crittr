// ─── Pet type ────────────────────────────────────────────────────────────────

export type PetType =
  | "dog"
  | "cat"
  | "fish"
  | "bird"
  | "reptile"
  | "small_mammal";

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
  /** Pro access valid until this ISO time; null = no Pro. Set server-side (Stripe / admin). */
  crittr_pro_until: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
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
  insurance_policy_number?: string | null;
  is_sterilized?: boolean | null;
  is_active: boolean;
  /** When true, pet stays in My Pets for remembrance; excluded from dashboard & active selection. */
  is_memorialized?: boolean;
  memorialized_at?: string | null;
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

export type MedicationDosePeriod = "day" | "week" | "month";

/**
 * Pet profile medication — mirrors `public.pet_medications`.
 * Schedule columns (`doses_per_period`, `dose_period`, `reminder_time`) require
 * `supabase/sql/pet_medications_schedule_columns.sql` (or migration
 * `20260328140000_ensure_pet_medications_schedule_columns.sql`) on the database.
 * Custom interval columns (`interval_count`, `interval_unit`): migration
 * `013_pet_medications_custom_interval.sql`.
 * `last_given_on`: migration `014_pet_medications_last_given_on.sql`.
 */
export type PetMedication = {
  id: string;
  pet_id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  condition: string | null;
  notes: string | null;
  /** Number of doses per `dose_period` (e.g. 2 per day). */
  doses_per_period?: number | null;
  /** day = per day, week = per week, month = per month. */
  dose_period?: MedicationDosePeriod | null;
  /** Custom interval: every N units (e.g. 3 + month = every 3 months). Null for standard schedule. */
  interval_count?: number | null;
  /** Pairs with interval_count: day | week | month. */
  interval_unit?: MedicationDosePeriod | null;
  /** Local time HH:mm (24h) for reminders. */
  reminder_time?: string | null;
  /** ISO date YYYY-MM-DD — last time the medication was given. */
  last_given_on?: string | null;
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
  /** Clinic name, address, or other place text. */
  location?: string | null;
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

// ─── Co-Care ─────────────────────────────────────────────────────────────────

export type CoCarePermissions = {
  can_log_activities: boolean;
  can_edit_pet_profile: boolean;
  can_manage_food: boolean;
  can_manage_medications: boolean;
  can_manage_vaccinations: boolean;
  can_manage_vet_visits: boolean;
  /** Upload, rename, or delete files in Medical records for this pet. */
  can_manage_pet_records: boolean;
};

export const DEFAULT_CO_CARE_PERMISSIONS: CoCarePermissions = {
  can_log_activities: true,
  can_edit_pet_profile: false,
  can_manage_food: false,
  can_manage_medications: false,
  can_manage_vaccinations: false,
  can_manage_vet_visits: false,
  can_manage_pet_records: false,
};

/** A medical record groups one or more uploaded files for a pet. */
export type PetMedicalRecord = {
  id: string;
  pet_id: string;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

/** Single file attached to a pet_medical_records row. */
export type PetMedicalRecordFile = {
  id: string;
  medical_record_id: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

/** Policy document uploaded for a pet (storage: bucket `pet-insurance`). */
export type PetInsuranceFile = {
  id: string;
  pet_id: string;
  uploaded_by: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

export type CoCarerInvite = {
  id: string;
  pet_id: string | null;
  invited_by: string;
  email: string;
  status: "pending" | "accepted" | "declined";
  invited_user_id: string | null;
  responded_at: string | null;
  /** Intended permissions when the invite is accepted (set by inviter). */
  permissions: CoCarePermissions;
  created_at: string;
};

export type PetCoCarer = {
  id: string;
  pet_id: string;
  user_id: string;
  invited_by: string | null;
  permissions: CoCarePermissions;
  created_at: string;
};

export type PetRole = "owner" | "co_carer";

export type PetWithRole = Pet & {
  role: PetRole;
  permissions?: CoCarePermissions;
};

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | "co_care_invite"
  | "co_care_accepted"
  | "co_care_removed";

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read: boolean;
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

/** Logged exercise activity — label, type, duration required; distance/location/notes optional. */
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

/** Logged food/treat — label, food selection, amount, and unit required; notes optional. */
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

/** Logged vet visit — label and location required (custom address when Location is Other); notes optional. */
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
  vaccinations: PetVaccination[];
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
  /** Doses per period, e.g. "2". */
  dosesPerPeriod: string;
  dosePeriod: MedicationDosePeriod | "";
  /** HH:mm 24h */
  reminderTime: string;
  notes: string;
};

export type VaccinationFormEntry = {
  localId: string;
  name: string;
  /** e.g. Annual, 3-year — optional */
  frequencyLabel: string;
  /** YYYY-MM-DD when known — drives due / overdue UI */
  expiresOn: string;
  notes: string;
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
  vaccinations: VaccinationFormEntry[];
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
  insurancePolicyNumber: string;
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
  vaccinations: [],
  coCarerEmail: "",
  isMicrochipped: null,
  microchipNumber: "",
  isSterilized: null,
  primaryVetClinic: "",
  primaryVetAddress: "",
  isInsured: null,
  insuranceProvider: "",
  insurancePolicyNumber: "",
};
