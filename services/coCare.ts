import { supabase } from "@/lib/supabase";
import type {
  CoCarePermissions,
  CoCarerInvite,
  PetCoCarer,
  Profile,
} from "@/types/database";

const DEFAULT_PERMISSIONS: CoCarePermissions = {
  can_log_activities: true,
  can_edit_pet_profile: false,
  can_manage_food: false,
  can_manage_medications: false,
  can_manage_vaccinations: false,
  can_manage_vet_visits: false,
};

const FULL_PERMISSIONS: CoCarePermissions = {
  can_log_activities: true,
  can_edit_pet_profile: true,
  can_manage_food: true,
  can_manage_medications: true,
  can_manage_vaccinations: true,
  can_manage_vet_visits: true,
};

// ─── Invites ────────────────────────────────────────────────────────────────

export async function sendCoCareInvite(
  petId: string,
  inviterUserId: string,
  email: string,
): Promise<{ invite: CoCarerInvite; isRegistered: boolean }> {
  const normalised = email.trim().toLowerCase();

  let invitedUserId: string | null = null;
  const { data: authLookup } = await supabase.rpc("lookup_user_by_email", {
    lookup_email: normalised,
  });
  if (authLookup && (authLookup as { id: string }[]).length > 0) {
    invitedUserId = (authLookup as { id: string }[])[0].id;
  }

  const { data: invite, error } = await supabase
    .from("co_carer_invites")
    .insert({
      pet_id: petId,
      invited_by: inviterUserId,
      email: normalised,
      invited_user_id: invitedUserId,
    })
    .select()
    .single();

  if (error) throw error;

  const { data: pet } = await supabase
    .from("pets")
    .select("name")
    .eq("id", petId)
    .single();

  const { data: inviter } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", inviterUserId)
    .single();

  const inviterName =
    [inviter?.first_name, inviter?.last_name].filter(Boolean).join(" ") ||
    "Someone";

  if (invitedUserId) {
    await supabase.from("notifications").insert({
      user_id: invitedUserId,
      type: "co_care_invite",
      title: "Co-care invitation",
      body: `${inviterName} invited you to co-care for ${pet?.name ?? "their pet"}.`,
      data: { pet_id: petId, invite_id: invite.id },
    });
  } else {
    try {
      await supabase.functions.invoke("send-co-care-invite", {
        body: {
          inviterName,
          petName: pet?.name ?? "their pet",
          inviteeEmail: normalised,
        },
      });
    } catch {
      // Email sending is best-effort; don't block the invite flow.
    }
  }

  return { invite: invite as CoCarerInvite, isRegistered: !!invitedUserId };
}

export async function fetchPendingInvitesForUser(
  userId: string,
): Promise<(CoCarerInvite & { pet_name?: string; inviter_name?: string })[]> {
  const { data: byUserId, error: err1 } = await supabase
    .from("co_carer_invites")
    .select("*")
    .eq("invited_user_id", userId)
    .eq("status", "pending");

  if (err1) throw err1;
  const invites = (byUserId ?? []) as CoCarerInvite[];

  if (invites.length === 0) return [];

  const petIds = [...new Set(invites.map((i) => i.pet_id).filter(Boolean))] as string[];
  const inviterIds = [...new Set(invites.map((i) => i.invited_by).filter(Boolean))];

  const [petsRes, profilesRes] = await Promise.all([
    petIds.length > 0
      ? supabase.from("pets").select("id, name").in("id", petIds)
      : Promise.resolve({ data: [] }),
    inviterIds.length > 0
      ? supabase.from("profiles").select("id, first_name, last_name").in("id", inviterIds)
      : Promise.resolve({ data: [] }),
  ]);

  const petMap = new Map((petsRes.data ?? []).map((p: any) => [p.id, p.name]));
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p: any) => [
      p.id,
      [p.first_name, p.last_name].filter(Boolean).join(" "),
    ]),
  );

  return invites.map((inv) => ({
    ...inv,
    pet_name: inv.pet_id ? petMap.get(inv.pet_id) ?? undefined : undefined,
    inviter_name: profileMap.get(inv.invited_by) ?? undefined,
  }));
}

export async function fetchSentInvitesForPet(
  petId: string,
): Promise<CoCarerInvite[]> {
  const { data, error } = await supabase
    .from("co_carer_invites")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CoCarerInvite[];
}

export async function acceptInvite(
  inviteId: string,
  userId: string,
): Promise<void> {
  const { data: invite, error: fetchErr } = await supabase
    .from("co_carer_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (fetchErr || !invite) throw fetchErr ?? new Error("Invite not found");

  // Insert co-carer row first (while invite is still "pending") so the RLS
  // policy on pet_co_carers can verify the invite exists.
  const { error: insertErr } = await supabase
    .from("pet_co_carers")
    .insert({
      pet_id: invite.pet_id,
      user_id: userId,
      invited_by: invite.invited_by,
      permissions: DEFAULT_PERMISSIONS,
    });

  if (insertErr) throw insertErr;

  const { error: updateErr } = await supabase
    .from("co_carer_invites")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (updateErr) throw updateErr;

  const { data: accepter } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .single();

  const accepterName = [accepter?.first_name, accepter?.last_name]
    .filter(Boolean)
    .join(" ") || "Someone";

  const { data: pet } = await supabase
    .from("pets")
    .select("name")
    .eq("id", invite.pet_id)
    .single();

  await supabase.from("notifications").insert({
    user_id: invite.invited_by,
    type: "co_care_accepted",
    title: "Invitation accepted",
    body: `${accepterName} accepted your invitation to co-care for ${pet?.name ?? "your pet"}.`,
    data: { pet_id: invite.pet_id },
  });
}

export async function declineInvite(
  inviteId: string,
): Promise<void> {
  const { error } = await supabase
    .from("co_carer_invites")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (error) throw error;
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from("co_carer_invites")
    .delete()
    .eq("id", inviteId);

  if (error) throw error;
}

// ─── Co-carer relationships ─────────────────────────────────────────────────

export type CoCarerWithProfile = PetCoCarer & {
  profile: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url"> | null;
};

export async function fetchCoCarersForPet(
  petId: string,
): Promise<CoCarerWithProfile[]> {
  const { data, error } = await supabase
    .from("pet_co_carers")
    .select("*, profile:profiles!pet_co_carers_user_id_fkey(id, first_name, last_name, avatar_url)")
    .eq("pet_id", petId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CoCarerWithProfile[];
}

export async function fetchUserPermissionsForPet(
  petId: string,
  userId: string,
): Promise<{ role: "owner" | "co_carer"; permissions: CoCarePermissions }> {
  const { data: pet } = await supabase
    .from("pets")
    .select("owner_id")
    .eq("id", petId)
    .single();

  if (pet?.owner_id === userId) {
    return { role: "owner", permissions: FULL_PERMISSIONS };
  }

  const { data: coCarer, error } = await supabase
    .from("pet_co_carers")
    .select("permissions")
    .eq("pet_id", petId)
    .eq("user_id", userId)
    .single();

  if (error || !coCarer) {
    throw error ?? new Error("No co-care relationship found");
  }

  return {
    role: "co_carer",
    permissions: coCarer.permissions as CoCarePermissions,
  };
}

export async function updateCoCarerPermissions(
  petId: string,
  coCarerUserId: string,
  permissions: CoCarePermissions,
): Promise<PetCoCarer> {
  const { data, error } = await supabase
    .from("pet_co_carers")
    .update({ permissions })
    .eq("pet_id", petId)
    .eq("user_id", coCarerUserId)
    .select()
    .single();

  if (error) throw error;
  return data as PetCoCarer;
}

export async function removeCoCarer(
  petId: string,
  coCarerUserId: string,
): Promise<void> {
  const { data: pet } = await supabase
    .from("pets")
    .select("name")
    .eq("id", petId)
    .single();

  const { error } = await supabase
    .from("pet_co_carers")
    .delete()
    .eq("pet_id", petId)
    .eq("user_id", coCarerUserId);

  if (error) throw error;

  await supabase.from("notifications").insert({
    user_id: coCarerUserId,
    type: "co_care_removed",
    title: "Co-care ended",
    body: `You have been removed as a co-carer for ${pet?.name ?? "a pet"}.`,
    data: { pet_id: petId },
  });
}

export async function leaveCoCare(
  petId: string,
  userId: string,
): Promise<void> {
  const { data: pet } = await supabase
    .from("pets")
    .select("name, owner_id")
    .eq("id", petId)
    .single();

  const { error } = await supabase
    .from("pet_co_carers")
    .delete()
    .eq("pet_id", petId)
    .eq("user_id", userId);

  if (error) throw error;

  if (pet?.owner_id) {
    const { data: leaver } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .single();

    const leaverName = [leaver?.first_name, leaver?.last_name]
      .filter(Boolean)
      .join(" ") || "Someone";

    await supabase.from("notifications").insert({
      user_id: pet.owner_id,
      type: "co_care_removed",
      title: "Co-carer left",
      body: `${leaverName} is no longer co-caring for ${pet.name ?? "your pet"}.`,
      data: { pet_id: petId },
    });
  }
}
