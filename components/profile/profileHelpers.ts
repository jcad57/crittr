import type { Pet, Profile } from "@/types/database";
import { formatPetTypeLabel } from "@/utils/petDisplay";

export function displayNameFromProfile(p: Profile | null): string {
  if (!p) return "Your name";
  const dn = p.display_name?.trim();
  if (dn) return dn;
  const parts = [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return "Your name";
}

export function accountFullNameLine(p: Profile | null): string {
  if (!p) return "";
  const fn = p.first_name?.trim() ?? "";
  const ln = p.last_name?.trim() ?? "";
  const combined = [fn, ln].filter(Boolean).join(" ");
  if (combined.length > 0) return combined;
  return p.display_name?.trim() ?? "";
}

export function initialsFromProfile(p: Profile | null, email: string): string {
  if (!p) return email?.[0]?.toUpperCase() ?? "?";
  const fn = p.first_name?.trim();
  const ln = p.last_name?.trim();
  if (fn?.[0] && ln?.[0]) return `${fn[0]}${ln[0]}`.toUpperCase();
  const dn = p.display_name?.trim();
  if (dn) {
    const parts = dn.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return dn.slice(0, 2).toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "?";
}

export function formatMemberSince(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

export function petSubtitle(p: Pet): string {
  const breed = p.breed?.trim();
  if (breed) return breed;
  return formatPetTypeLabel(p.pet_type);
}
