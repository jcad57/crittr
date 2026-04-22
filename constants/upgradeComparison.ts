/**
 * Comparison rows shown on the upgrade screen.
 * Aligned with `Context Files/CrittrPro.md`.
 */

export type UpgradeCellDisplay = "check" | "x" | "pill";

export type UpgradeCompareRow = {
  title: string;
  subtitle?: string;
  free: { type: UpgradeCellDisplay; label?: string };
  pro: { type: UpgradeCellDisplay; label?: string };
};

export const UPGRADE_COMPARISON_ROWS: UpgradeCompareRow[] = [
  {
    title: "Pets",
    subtitle: "Companions you manage",
    free: { type: "pill", label: "1" },
    pro: { type: "pill", label: "Unlimited" },
  },
  {
    title: "Meals, treats & meds",
    subtitle: "Food, treats, medications, vaccinations",
    free: { type: "pill", label: "1 each" },
    pro: { type: "pill", label: "Unlimited" },
  },
  {
    title: "No ads",
    subtitle: "Ad-free experience",
    free: { type: "x" },
    pro: { type: "check" },
  },
  {
    title: "Upload pet records",
    subtitle: "Documents and files",
    free: { type: "x" },
    pro: { type: "check" },
  },
  {
    title: "Co-care",
    subtitle: "Share care with others",
    free: { type: "x" },
    pro: { type: "check" },
  },
  {
    title: "CrittrAI",
    subtitle: "Smart assistance",
    free: { type: "x" },
    pro: { type: "check" },
  },
  {
    title: "Notifications & reminders",
    subtitle: "Stay on schedule",
    free: { type: "x" },
    pro: { type: "check" },
  },
];
