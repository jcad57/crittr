/**
 * When Crittr Pro ends (Stripe subscription deleted), free-tier rules apply:
 * - User keeps one living (non-memorialized) pet (oldest by created_at); others are removed.
 * - Co-care ends: remove this user as co-carer on others' pets (notify owners) and
 *   remove all co-carers from this user's pets (notify co-carers, same types as app flows).
 * - Pending invites sent by this user are deleted.
 *
 * Invoked from stripe-webhook with service_role (bypasses RLS).
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function displayName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  const n = [first, last].filter(Boolean).join(" ").trim();
  return n.length > 0 ? n : "Someone";
}

async function ensureOneActiveLivingPet(
  admin: SupabaseClient,
  ownerId: string,
): Promise<void> {
  const { data: rows, error } = await admin
    .from("pets")
    .select("id, is_memorialized, is_active")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const pets = rows ?? [];
  const living = pets.filter((p) => !p.is_memorialized);
  if (living.length === 0) {
    await admin.from("pets").update({ is_active: false }).eq("owner_id", ownerId);
    return;
  }
  const hasLivingActive = living.some((p) => p.is_active);
  if (hasLivingActive) return;

  await admin.from("pets").update({ is_active: false }).eq("owner_id", ownerId);
  await admin
    .from("pets")
    .update({ is_active: true })
    .eq("id", living[0].id)
    .eq("owner_id", ownerId);
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

  const { error: invErr } = await admin
    .from("co_carer_invites")
    .delete()
    .eq("invited_by", userId);

  if (invErr) throw invErr;

  const { data: living, error: livErr } = await admin
    .from("pets")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_memorialized", false)
    .order("created_at", { ascending: true });

  if (livErr) throw livErr;

  const livingList = living ?? [];
  if (livingList.length > 1) {
    const removeIds = livingList.slice(1).map((p) => p.id as string);
    const { error: delPetErr } = await admin.from("pets").delete().in("id", removeIds);
    if (delPetErr) throw delPetErr;
  }

  await ensureOneActiveLivingPet(admin, userId);
}
