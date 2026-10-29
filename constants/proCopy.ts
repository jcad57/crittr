/**
 * Crittr Pro messaging — benefits and outcomes, not a feature checklist.
 * Keep claims aligned with what the product actually does.
 */

export type ProSoftPaywallKind =
  | "pets"
  | "records"
  | "coCare"
  | "crittrAi";

export const PRO_PAYWALL_HEADLINE = "Take better care of the pets you love.";

export const FREE_TIER_SUMMARY =
  "Free includes 3 pets, 1 co-carer per pet, and unlimited activity logs, foods, medications, and vaccinations.";

export const PRO_PAYWALL_BENEFITS: {
  icon: "heart-outline" | "paw" | "clipboard-text-outline" | "weather-sunny" | "advertisements-off";
  title: string;
  subtitle: string;
}[] = [
  { icon: "paw", title: "Unlimited pets", subtitle: "Add every companion, beyond the 3 pets included on Free." },
  { icon: "heart-outline", title: "Unlimited co-carers", subtitle: "Invite more than 1 co-carer per pet. They can join on Free." },
  { icon: "clipboard-text-outline", title: "Medical record storage", subtitle: "Upload and organize documents, photos, and insurance files." },
  { icon: "weather-sunny", title: "CrittrAI", subtitle: "Ask care questions with your pet’s saved profile as context." },
  { icon: "advertisements-off", title: "No ads", subtitle: "Focus on your pets, without ads." },
];

const FALLBACK_PET = "your pet";

function petLabel(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : FALLBACK_PET;
}

export function softPaywallCopy(
  kind: ProSoftPaywallKind,
  petName?: string | null,
): { title: string; body: string } {
  const pet = petLabel(petName);

  switch (kind) {
    case "pets":
      return {
        title: "Bring the whole family",
        body: "Free includes 3 pets, including memorialized pets. Upgrade to Crittr Pro to add unlimited pets.",
      };
    case "records":
      return {
        title: "Keep important records close",
        body: `Let Crittr keep track of ${pet}'s medical records for you by unlocking uploads with Crittr Pro!`,
      };
    case "coCare":
      return {
        title: "Care is better together",
        body: `Free includes 1 co-carer per pet. Upgrade to Crittr Pro to invite unlimited co-carers for ${pet}. Pending invites reserve a spot.`,
      };
    case "crittrAi":
      return {
        title: "A little extra help when you need it",
        body: `Ask questions about ${pet}’s care and routines, grounded in the profile you’ve already built.`,
      };
  }
}

export function milestoneCelebrationCopy(
  petName: string,
  activityCount: number,
): { title: string; body: string; invite: string } {
  const pet = petLabel(petName);
  return {
    title: `${pet} is getting a lot of love`,
    body: `You’ve logged ${activityCount} ${
      activityCount === 1 ? "activity" : "activities"
    } for ${pet} this month.`,
    invite: `Keep the care going — share ${pet}’s routine with 1 co-carer on Free, or invite unlimited co-carers with Crittr Pro.`,
  };
}

export const PRO_ONBOARDING_COPY = {
  welcomeTitle: "You and your pets just got a little more help.",
  welcomeLead: "Welcome to Crittr Pro.",
  welcomeCta: "Let's get started",
  cocareTitle: "Care is better together.",
  cocareLead:
    "Invite your care team with unlimited co-carers for every pet. They can join on Free.",
  cocareCta: "Set up co-care",
  cocareSkip: "Maybe later",
  expand: {
    addPet: {
      title: "Bring the whole family",
      lead: "Add another pet so every companion’s care lives in one place.",
      cta: "Add another pet",
    },
    records: {
      title: "Keep important records close",
      lead: "Store documents right alongside their care history.",
      cta: "Upload a record",
    },
    crittrAi: {
      title: "Meet CrittrAI",
      lead: "Ask questions about your pet’s care, using the profile you’ve built.",
      cta: "Try CrittrAI",
    },
  },
  expandSkip: "Maybe later",
  doneTitle: "You’re all set.",
  doneLead: (petName: string | null) =>
    petName?.trim()
      ? `Crittr Pro is ready to help you care for ${petName.trim()}.`
      : "Crittr Pro is ready to help you care for your pets.",
  doneCta: "Go to Crittr",
} as const;
