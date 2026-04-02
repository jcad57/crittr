import type { CoCarePermissions } from "@/types/database";

export type CoCarePermissionRowMeta = {
  key: keyof CoCarePermissions;
  label: string;
  description: string;
  icon: string;
};

export const CO_CARE_PERMISSION_ROWS: CoCarePermissionRowMeta[] = [
  {
    key: "can_log_activities",
    label: "Log activities",
    description: "Log exercise, food, medication, and vet visit entries",
    icon: "clipboard-text-outline",
  },
  {
    key: "can_edit_pet_profile",
    label: "Edit pet profile",
    description: "Change name, breed, details, avatar, and exercise goals",
    icon: "pencil-outline",
  },
  {
    key: "can_manage_food",
    label: "Manage food",
    description: "Add, edit, or remove food and treat entries",
    icon: "food-drumstick-outline",
  },
  {
    key: "can_manage_medications",
    label: "Manage medications",
    description: "Add, edit, or remove medication entries",
    icon: "pill",
  },
  {
    key: "can_manage_vaccinations",
    label: "Manage vaccinations",
    description: "Add, edit, or remove vaccination records",
    icon: "needle",
  },
  {
    key: "can_manage_vet_visits",
    label: "Manage vet visits",
    description: "Create, edit, or delete scheduled vet visits",
    icon: "hospital-box-outline",
  },
  {
    key: "can_manage_pet_records",
    label: "Manage medical files",
    description:
      "Upload, rename, or remove documents and photos in Medical records",
    icon: "file-document-outline",
  },
];
