import type { Profile } from "@/types/database";

/** Display name for a profile row (display_name, or first + last). */
export function formatProfileDisplayName(
  p: Profile | null | undefined,
): string {
  if (!p) return "";
  const dn = p.display_name?.trim();
  if (dn) return dn;
  const parts = [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return "";
}

/**
 * Maps user ids to display names. After a successful fetch, any requested id
 * without a profile row is set to "Unknown". Before fetch completes, only ids
 * present in `profiles` are in the map (others stay unresolved for loading UI).
 */
export function buildActivityLoggerNameMap(
  profiles: Profile[] | undefined,
  requestedUserIds: string[],
  fetchSucceeded: boolean,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of profiles ?? []) {
    m.set(p.id, formatProfileDisplayName(p) || "Unknown");
  }
  if (fetchSucceeded && requestedUserIds.length > 0) {
    for (const id of requestedUserIds) {
      if (!m.has(id)) m.set(id, "Unknown");
    }
  }
  return m;
}

/**
 * Label under the activity title: resolved profile name, "You" for the
 * current user, "Unknown" when missing, or "" while names are still loading.
 */
export function resolveActivityLoggerLabel(
  loggedByUserId: string | null | undefined,
  nameByUserId: Map<string, string>,
  currentUserId: string | null | undefined,
): string {
  if (!loggedByUserId) return "Unknown";
  if (loggedByUserId === currentUserId) return "You";
  const resolved = nameByUserId.get(loggedByUserId);
  if (resolved !== undefined) return resolved;
  return "";
}
