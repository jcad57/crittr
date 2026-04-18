import { supabase } from "@/lib/supabase";
import {
  DEFAULT_CO_CARE_PERMISSIONS,
  type CoCarePermissions,
  type CoCarerInvite,
  type PetCoCarer,
  type Profile,
} from "@/types/database";

/** Shown when the invitee tries to accept without active Pro (matches RLS on `pet_co_carers`). */
export const CO_CARE_ACCEPT_NEEDS_PRO_MESSAGE =
  "Crittr Pro is required to co-care. Upgrade to accept this invitation.";

const CO_CARE_INVITE_VALIDATION_MESSAGES: Record<string, string> = {
  email_required: "Enter an email address to send an invite.",
  not_owner: "You can only invite co-carers for pets you own.",
  inviter_not_pro: "Crittr Pro is required to invite co-carers.",
};

function messageForCoCareInviteValidation(code: string | undefined): string {
  if (!code) return "Could not send this invite.";
  return CO_CARE_INVITE_VALIDATION_MESSAGES[code] ?? "Could not send this invite.";
}

/** PostgREST sometimes returns jsonb RPC results as a JSON string. */
function parseCoCareInviteValidation(raw: unknown): {
  ok: boolean;
  code?: string;
} | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as { ok?: unknown; code?: string };
      return typeof p.ok === "boolean"
        ? { ok: p.ok, code: p.code }
        : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as { ok?: unknown; code?: string };
    return typeof o.ok === "boolean" ? { ok: o.ok, code: o.code } : null;
  }
  return null;
}

function permissionsForNewCoCarerRow(invite: {
  permissions?: unknown;
}): CoCarePermissions {
  const raw = invite.permissions;
  if (raw && typeof raw === "object" && raw !== null) {
    return { ...DEFAULT_CO_CARE_PERMISSIONS, ...(raw as CoCarePermissions) };
  }
  return DEFAULT_CO_CARE_PERMISSIONS;
}

/** Coerce RPC `RETURNS TABLE` results (array, single object, or null). */
function normalizeRpcRows<T extends { id?: string }>(data: unknown): T[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === "object") return [data as T];
  return [];
}

const FULL_PERMISSIONS: CoCarePermissions = {
  can_log_activities: true,
  can_edit_pet_profile: true,
  can_manage_food: true,
  can_manage_medications: true,
  can_manage_vaccinations: true,
  can_manage_vet_visits: true,
  can_manage_pet_records: true,
};

// ─── Invites ────────────────────────────────────────────────────────────────

export async function sendCoCareInvite(
  petId: string,
  inviterUserId: string,
  email: string,
  permissions: CoCarePermissions = DEFAULT_CO_CARE_PERMISSIONS,
): Promise<{
  invite: CoCarerInvite;
  isRegistered: boolean;
  inviteeNeedsPro: boolean;
}> {
  const normalised = email.trim().toLowerCase();

  const { data: validation, error: validationError } = await supabase.rpc(
    "validate_co_care_invite_send",
    { p_pet_id: petId, p_invitee_email: normalised },
  );
  if (validationError) throw validationError;

  const verdict = parseCoCareInviteValidation(validation);
  if (!verdict?.ok) {
    throw new Error(messageForCoCareInviteValidation(verdict?.code));
  }

  const validationCode = verdict.code ?? "";
  const inviteeNeedsPro = validationCode === "registered_needs_pro";

  let invitedUserId: string | null = null;
  const { data: authLookup, error: lookupError } = await supabase.rpc(
    "lookup_user_by_email",
    { lookup_email: normalised },
  );
  if (lookupError) {
    console.warn("lookup_user_by_email failed:", lookupError.message);
  }
  // PostgREST usually returns an array of rows; a single row may come back as one object.
  const lookupRows = normalizeRpcRows<{ id: string }>(authLookup);
  if (lookupRows.length > 0) {
    invitedUserId = lookupRows[0].id;
  }

  const { data: invite, error } = await supabase
    .from("co_carer_invites")
    .insert({
      pet_id: petId,
      invited_by: inviterUserId,
      email: normalised,
      invited_user_id: invitedUserId,
      permissions,
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

  // In-app notifications for registered invitees: DB trigger
  // `notify_co_carer_invite_after_insert` (handles Pro vs non‑Pro).

  if (!invitedUserId) {
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

  return {
    invite: invite as CoCarerInvite,
    isRegistered: !!invitedUserId,
    inviteeNeedsPro: !!invitedUserId && inviteeNeedsPro,
  };
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
): Promise<{ petId: string }> {
  const { data: invite, error: fetchErr } = await supabase
    .from("co_carer_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (fetchErr || !invite) throw fetchErr ?? new Error("Invite not found");

  const { data: accepterHasPro, error: proErr } =
    await supabase.rpc("user_has_crittr_pro");
  if (proErr) throw proErr;
  if (!accepterHasPro) {
    throw new Error(CO_CARE_ACCEPT_NEEDS_PRO_MESSAGE);
  }

  // Insert co-carer row first (while invite is still "pending") so the RLS
  // policy on pet_co_carers can verify the invite exists.
  const { error: insertErr } = await supabase
    .from("pet_co_carers")
    .insert({
      pet_id: invite.pet_id,
      user_id: userId,
      invited_by: invite.invited_by,
      permissions: permissionsForNewCoCarerRow(invite),
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

  return { petId: invite.pet_id as string };
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
    permissions: {
      ...DEFAULT_CO_CARE_PERMISSIONS,
      ...(coCarer.permissions as CoCarePermissions),
    },
  };
}

export async function updateCoCarerPermissions(
  petId: string,
  coCarerUserId: string,
  permissions: CoCarePermissions,
): Promise<PetCoCarer> {
  const merged: CoCarePermissions = {
    ...DEFAULT_CO_CARE_PERMISSIONS,
    ...permissions,
  };
  const { data, error } = await supabase
    .from("pet_co_carers")
    .update({ permissions: merged })
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
