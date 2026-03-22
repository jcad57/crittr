import { Colors } from "@/constants/colors";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Pet = {
  id: string;
  name: string;
  breed: string;
  imageUrl: string | null;
};

export type FeedingSchedule = {
  mealsPerDay: number;
  portionSize: string;
  foodBrand: string;
  feedingTimes: string[];
  notes: string;
};

export type ExerciseRequirements = {
  walksPerDay: number;
  walkDurationMinutes: number;
  activities: string[];
};

export type PetProfile = Pet & {
  age: number;
  weightLbs: number;
  sex: "male" | "female";
  color: string;
  about: string;
  feeding: FeedingSchedule;
  exercise: ExerciseRequirements;
  medications: Medication[];
  vetVisits: VetVisit[];
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
  /** 0–23 hour of the day this activity occurred */
  hour: number;
  category: ActivityCategory;
  segments: TextSegment[];
  /** Display name of the co-carer who logged this activity */
  loggedBy: string;
};

export type Medication = {
  id: string;
  name: string;
  frequency: string;
  condition: string;
  dosageDesc: string;
  current: number;
  total: number;
  lastTaken?: string;
  iconBg: string;
  iconColor: string;
};

export type VetVisit = {
  id: string;
  title: string;
  date: string;
  time: string;
  accentColor: string;
};

// ─── Mock data ──────────────────────────────────────────────────────────────

export const MOCK_PETS: Pet[] = [
  { id: "1", name: "Bart", breed: "Great Pyrenees", imageUrl: null },
];

export const MOCK_ALERT: AlertData = {
  id: "alert-1",
  petName: "Bart",
  message: "has an upcoming vet visit on\nOct 29 at 2:30pm.",
};

export const MOCK_DAILY_PROGRESS: DailyProgressCategory[] = [
  {
    id: "exercise",
    label: "Exercise",
    icon: "run",
    current: 1,
    total: 2,
    ringColor: Colors.coral,
    trackColor: Colors.coralLight,
  },
  {
    id: "meals",
    label: "Meals",
    icon: "food-drumstick",
    current: 2,
    total: 2,
    ringColor: Colors.lavender,
    trackColor: Colors.lavenderLight,
  },
  {
    id: "treats",
    label: "Treats",
    icon: "bone",
    current: 3,
    total: 4,
    ringColor: Colors.sky,
    trackColor: Colors.skyLight,
  },
  {
    id: "meds",
    label: "Meds",
    icon: "pill",
    current: 1,
    total: 1,
    ringColor: Colors.gold,
    trackColor: Colors.goldLight,
  },
];

export const MOCK_ACTIVITIES: ActivityEntry[] = [
  {
    id: "act-1",
    hour: 12,
    category: "treats",
    loggedBy: "Alex",
    segments: [
      { text: "Gave " },
      { text: "Bart", bold: true },
      { text: " a " },
      { text: "Peanut Butter", bold: true },
      { text: " treat" },
    ],
  },
  {
    id: "act-2",
    hour: 11,
    category: "meds",
    loggedBy: "Jordan",
    segments: [
      { text: "Gave " },
      { text: "Bart", bold: true },
      { text: " 2 tablets of " },
      { text: "Benadryl", bold: true },
    ],
  },
  {
    id: "act-3",
    hour: 10,
    category: "exercise",
    loggedBy: "Jordan",
    segments: [
      { text: "Walked " },
      { text: "Bart", bold: true },
      { text: " for " },
      { text: "25 minutes", bold: true },
    ],
  },
  {
    id: "act-4",
    hour: 8,
    category: "meals",
    loggedBy: "Alex",
    segments: [
      { text: "Fed " },
      { text: "Bart", bold: true },
      { text: " 3 cups of " },
      { text: "Blue Buffalo", bold: true },
    ],
  },
];

export const MOCK_MEDICATIONS: Medication[] = [
  {
    id: "med-1",
    name: "Benadryl",
    frequency: "Daily",
    condition: "Allergies",
    dosageDesc: "2 tablets · With meal",
    current: 2,
    total: 2,
    lastTaken: "10/19/2025",
    iconBg: Colors.successLight,
    iconColor: Colors.success,
  },
  {
    id: "med-2",
    name: "Methotrexate",
    frequency: "Weekly",
    condition: "Autoimmune",
    dosageDesc: "1 Tablet · With meal",
    current: 1,
    total: 1,
    lastTaken: "10/19/2025",
    iconBg: Colors.successLight,
    iconColor: Colors.success,
  },
];

export const MOCK_VET_VISITS: VetVisit[] = [
  {
    id: "vet-1",
    title: "Annual Checkup",
    date: "October 22, 2025",
    time: "1pm - 2pm",
    accentColor: Colors.orange,
  },
  {
    id: "vet-2",
    title: "Skin Concern",
    date: "October 28, 2025",
    time: "1pm - 2pm",
    accentColor: Colors.coral,
  },
];

// Full pet profiles — keyed by Pet.id for O(1) lookup from the profile page.
export const MOCK_PET_PROFILES: Record<string, PetProfile> = {
  "1": {
    id: "1",
    name: "Bart",
    breed: "Great Pyrenees",
    imageUrl: null,
    age: 3,
    weightLbs: 85,
    sex: "male",
    color: "White",
    about:
      "Bart is a gentle giant with a heart of gold. He loves long walks in the park, belly rubs, and keeping a watchful eye over the family. Despite his size, he's incredibly gentle with kids and other animals.",
    feeding: {
      mealsPerDay: 2,
      portionSize: "3 cups",
      foodBrand: "Blue Buffalo",
      feedingTimes: ["7:00 AM", "6:00 PM"],
      notes: "Prefers food at room temperature. Use slow-feeder bowl.",
    },
    exercise: {
      walksPerDay: 2,
      walkDurationMinutes: 30,
      activities: ["Fetch in backyard", "Off-leash play", "Swimming"],
    },
    medications: MOCK_MEDICATIONS,
    vetVisits: MOCK_VET_VISITS,
  },
};
