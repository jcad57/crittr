/**
 * When Crittr Pro ends (RevenueCat subscription expired), free-tier rules apply:
 *
 *   - Free tier keeps **one** living owned pet. Anything beyond the oldest
 *     living pet is **soft-archived** (`is_archived = true`,
 *     `archived_reason = 'pro_downgrade'`), never deleted, so the user gets
 *     all of their data back the moment they re-upgrade.
 *   - Co-care ends in both directions: this user is removed as a co-carer on
 *     others' pets (owners are notified), and every co-carer is removed from
 *     this user's pets (co-carers are notified). Pending invites sent by this
 *     user are deleted.
 *
 * Invoked from `revenueCatEntitlement.ts` with service_role (bypasses RLS).
 *
 * Soft-archive design notes:
 *   - We never `DELETE FROM pets`. A transient RC REST blip used to cause a
 *     reconcile to look like a downgrade and irreversibly destroyed the user's
 *     "extra" pets. With soft-archive, the same transient is harmless because
 *     `restorePetsArchivedDuringDowngrade` flips everything back as soon as
 *     the subscriber appears Pro again.
 *   - The `is_active` flag is repaired afterwards so the dashboard always has
 *     exactly one living, non-archived active pet (or zero, if the user has
 *     no surviving pets — handled by `repair_pet_active_flag` RPC).
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function displayName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  const n = [first, last].filter(Boolean).join(" ").trim();
  return n.length > 0 ? n : "Someone";
}

async function repairActivePet(
  admin: SupabaseClient,
  ownerId: string,
): Promise<void> {
  // Server-side helper (added in `20260514120000_pro_sync_hardening.sql`)
  // guarantees exactly one living, non-archived owned pet is `is_active`.
  const { error } = await admin.rpc("repair_pet_active_flag", {
    target_owner: ownerId,
  });
  if (error) {
    console.warn("[downgradeCleanup] repair_pet_active_flag failed:", error);
  }
}

/**
 * Reverses any prior Pro-downgrade soft-archival on the user's pets so that
 * users who renew or re-subscribe (including via promo code) immediately see
 * their old pets again without manual intervention.
 *
 * Safe to call on every successful reconcile — it's a no-op when no rows
 * carry the `pro_downgrade` archive marker.
 */
export async function restorePetsArchivedDuringDowngrade(
  admin: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await admin.rpc("restore_pro_archived_pets", {
    target_owner: userId,
  });
  if (error) {
    console.warn(
      "[downgradeCleanup] restore_pro_archived_pets failed:",
      error,
    );
    return 0;
  }
  return typeof data === "number" ? data : 0;
}

export async function applyCrittrProDowngradeCleanup(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  const leaverName = displayName(profile?.first_name, profile?.last_name);

  // 1. Drop co-care links the user has on OTHER people's pets (notify owners).
  const { data: myCoCarerRows, error: myCoErr } = await admin
    .from("pet_co_carers")
    .select("pet_id")
    .eq("user_id", userId);
  if (myCoErr) throw myCoErr;

  for (const row of myCoCarerRows ?? []) {
    const petId = row.pet_id as string;
    const { data: pet } = await admin
      .from("pets")
      .select("name, owner_id")
      .eq("id", petId)
      .maybeSingle();

    if (!pet?.owner_id) continue;

    const { error: delErr } = await admin
      .from("pet_co_carers")
      .delete()
      .eq("pet_id", petId)
      .eq("user_id", userId);
    if (delErr) throw delErr;

    if (pet.owner_id === userId) continue;

    const { error: nErr } = await admin.from("notifications").insert({
      user_id: pet.owner_id as string,
      type: "co_care_removed",
      title: "Co-carer left",
      body: `${leaverName} is no longer co-caring for ${pet.name ?? "your pet"}.`,
      data: { pet_id: petId },
    });
    if (nErr) throw nErr;
  }

  // 2. Remove co-carers from THIS user's owned pets (notify each co-carer).
  const { data: ownedPets, error: ownedErr } = await admin
    .from("pets")
    .select("id, name")
    .eq("owner_id", userId);
  if (ownedErr) throw ownedErr;

  for (const pet of ownedPets ?? []) {
    const petId = pet.id as string;
    const { data: carers, error: cErr } = await admin
      .from("pet_co_carers")
      .select("user_id")
      .eq("pet_id", petId);
    if (cErr) throw cErr;

    for (const c of carers ?? []) {
      const coCarerUserId = c.user_id as string;
      const { error: delCoErr } = await admin
        .from("pet_co_carers")
        .delete()
        .eq("pet_id", petId)
        .eq("user_id", coCarerUserId);
      if (delCoErr) throw delCoErr;

      const { error: nErr } = await admin.from("notifications").insert({
        user_id: coCarerUserId,
        type: "co_care_removed",
        title: "Co-care ended",
        body: `You have been removed as a co-carer for ${pet.name ?? "a pet"}.`,
        data: { pet_id: petId },
      });
      if (nErr) throw nErr;
    }
  }

  // 3. Cancel pending invites this user sent.
  const { error: invErr } = await admin
    .from("co_carer_invites")
    .delete()
    .eq("invited_by", userId);
  if (invErr) throw invErr;

  // 4. Free-tier pet limit — soft archive everything past the oldest living pet.
  //    We never delete; the data comes back the moment they re-upgrade.
  const { data: living, error: livErr } = await admin
    .from("pets")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_memorialized", false)
    .eq("is_archived", false)
    .order("created_at", { ascending: true });
  if (livErr) throw livErr;

  const livingList = living ?? [];
  if (livingList.length > 1) {
    const archiveIds = livingList.slice(1).map((p) => p.id as string);
    const { error: archErr } = await admin
      .from("pets")
      .update({
        is_archived: true,
        archived_reason: "pro_downgrade",
        archived_at: new Date().toISOString(),
        is_active: false,
      })
      .in("id", archiveIds);
    if (archErr) throw archErr;
  }

  await repairActivePet(admin, userId);
}
