import type { RecordsNavItem } from "@/components/ui/pet/RecordsNavCard";
import { Colors } from "@/constants/colors";
import type { PetProfile } from "@/types/ui";
import type { Href } from "expo-router";

/** Pet profile Records / Manage rows — matches food-section PNG sizing via `RecordsNavCard`. */
export const PET_PROFILE_RECORD_ICONS = {
  medicalRecords: require("@/assets/icons/medical-records-icon.png"),
  calendar: require("@/assets/icons/calendar-icon.png"),
  microchip: require("@/assets/icons/microchip-icon.png"),
  insurance: require("@/assets/icons/insurance-icon.png"),
  activity: require("@/assets/icons/pet-walk-icon.png"),
  visibility: require("@/assets/icons/visibility-icon.png"),
  coCare: require("@/assets/icons/co-care-icon.png"),
} as const;

export function buildRecordsItems(
  profile: PetProfile,
  push: (href: Href) => void,
): RecordsNavItem[] {
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
}

export function buildManageItems(
  profile: PetProfile,
  opts: {
    roleLoading: boolean;
    isOwner: boolean;
    isCoCarer: boolean;
    push: (href: Href) => void;
    runWithProOrUpgrade: (fn: () => void) => Promise<boolean>;
    handleLeaveCoCare: () => void;
  },
): RecordsNavItem[] {
  const {
    roleLoading,
    isOwner,
    isCoCarer,
    push,
    runWithProOrUpgrade,
    handleLeaveCoCare,
  } = opts;
  if (roleLoading) return [];
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
}
