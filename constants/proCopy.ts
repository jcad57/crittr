/**
 * Crittr Pro messaging — benefits and outcomes, not a feature checklist.
 * Keep claims aligned with what the product actually does.
 */

export type ProSoftPaywallKind =
  | "pets"
  | "food"
  | "medications"
  | "vaccinations"
  | "records"
  | "coCare"
  | "crittrAi";

export const PRO_PAYWALL_HEADLINE = "Take better care of the pets you love.";

export const PRO_PAYWALL_BENEFITS: {
  icon: "heart-outline" | "paw" | "clipboard-text-outline" | "weather-sunny";
  title: string;
  subtitle: string;
}[] = [
  {
    icon: "heart-outline",
    title: "Care for your pets together",
    subtitle: "Invite someone you trust so everyone can stay on the same page.",
  },
  {
    icon: "paw",
    title: "Keep every pet in one place",
    subtitle: "Routines and care for the whole household, together.",
  },
  {
    icon: "clipboard-text-outline",
    title: "Keep their care organized",
    subtitle:
      "Meals, medications, vaccinations, and records alongside their history.",
  },
  {
    icon: "weather-sunny",
    title: "A calmer Crittr",
    subtitle: "Focus on your pet without ads or interruptions.",
  },
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
        body: "Keep every pet’s routine and care in one place — so no one gets left out.",
      };
    case "food":
      return {
        title: "Keep every meal and treat in one place",
        body: `Save the foods ${pet} actually eats, so logging a meal is quick when life is busy.`,
      };
    case "medications":
      return {
        title: "Track more medications",
        body: `More meds means more opportunities to forget! Stay on track with ${pet}'s medications.`,
      };
    case "vaccinations":
      return {
        title: "Keep the full record together",
        body: `Keep ${pet}’s complete vaccination history in one place, ready when you need it.`,
      };
    case "records":
      return {
        title: "Keep important records close",
        body: `Let Crittr keep track of ${pet}'s medical records for you by unlocking uploads with Crittr Pro!`,
      };
    case "coCare":
      return {
        title: "Care is better together",
        body: `Have fewer "did we..?" moments by inviting someone to help share ${pet}’s routine. You can do that with Crittr Pro!`,
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
    invite: `Keep the care going — invite someone you trust to help share ${pet}’s routine with Crittr Pro.`,
  };
}

export const PRO_ONBOARDING_COPY = {
  welcomeTitle: "You and your pets just got a little more help.",
  welcomeLead: "Welcome to Crittr Pro.",
  welcomeCta: "Let's get started",
  cocareTitle: "Care is better together.",
  cocareLead:
    "Invite someone you trust to help keep your pet’s routine on track.",
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
    medications: {
      title: "Keep every treatment organized",
      lead: "Save each medication so doses are easier to follow.",
      cta: "Add a medication",
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
