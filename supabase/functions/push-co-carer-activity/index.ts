/**
 * push-co-carer-activity
 *
 * After a co-carer logs an activity, the client invokes this with `{ activity_id }`.
 * Verifies the JWT matches `pet_activities.logged_by`, then sends Expo push notifications
 * to the pet owner and other co-carers who have `notify_co_care_activities` enabled and
 * a row in `user_expo_push_tokens`.
 *
 * In-app notification rows are created by the DB trigger `notify_co_carers_on_activity_insert`;
 * this function covers the app-killed / no-Realtime case.
 *
 * Deploy:
 *   supabase functions deploy push-co-carer-activity
 *
 * Secrets: standard SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ActivityRow = {
  id: string;
  pet_id: string;
  logged_by: string | null;
  activity_type: string;
  label: string | null;
  is_treat: boolean | null;
  vet_visit_id: string | null;
};

function buildBody(
  actorName: string,
  petName: string,
  act: ActivityRow,
): string {
  const kind =
    act.activity_type === "food"
      ? act.is_treat === true
        ? "a treat"
        : "a meal"
      : act.activity_type === "exercise"
        ? "exercise"
        : act.activity_type === "medication"
          ? "a medication"
          : act.activity_type === "potty"
            ? "potty"
            : act.activity_type === "training"
              ? "training"
              : act.activity_type === "vet_visit"
                ? "a vet visit"
                : "an activity";
  return `${actorName} logged ${kind} for ${petName}: ${act.label ?? ""}`.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { activity_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const activityId =
    typeof body.activity_id === "string" ? body.activity_id.trim() : "";
  if (!activityId) {
    return new Response(JSON.stringify({ error: "activity_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseAnon || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: act, error: actErr } = await admin
    .from("pet_activities")
    .select(
      "id, pet_id, logged_by, activity_type, label, is_treat, vet_visit_id",
    )
    .eq("id", activityId)
    .maybeSingle();

  if (actErr || !act) {
    return new Response(JSON.stringify({ error: "Activity not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const row = act as ActivityRow;

  if (!row.logged_by || row.logged_by !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (row.vet_visit_id != null) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: pet, error: petErr } = await admin
    .from("pets")
    .select("id, name, owner_id")
    .eq("id", row.pet_id)
    .maybeSingle();

  if (petErr || !pet?.owner_id) {
    return new Response(JSON.stringify({ error: "Pet not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const petName = (pet.name as string)?.trim() || "your pet";
  const ownerId = pet.owner_id as string;

  const { data: actorProfile } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const actorName =
    [actorProfile?.first_name, actorProfile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Someone";

  const title = `${petName}: activity logged`;
  const msgBody = buildBody(actorName, petName, row);
  const href = `/(logged-in)/manage-activity-item/${row.id}`;

  const recipientIds = new Set<string>();

  if (ownerId !== user.id) {
    const { data: op } = await admin
      .from("profiles")
      .select("id, notify_co_care_activities")
      .eq("id", ownerId)
      .maybeSingle();
    if (op && (op.notify_co_care_activities !== false)) {
      recipientIds.add(ownerId);
    }
  }

  const { data: coCarers } = await admin
    .from("pet_co_carers")
    .select("user_id")
    .eq("pet_id", row.pet_id);

  for (const cc of coCarers ?? []) {
    const uid = cc.user_id as string;
    if (uid === user.id) continue;
    const { data: pr } = await admin
      .from("profiles")
      .select("notify_co_care_activities")
      .eq("id", uid)
      .maybeSingle();
    if (pr && (pr.notify_co_care_activities !== false)) {
      recipientIds.add(uid);
    }
  }

  if (recipientIds.size === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: tokenRows } = await admin
    .from("user_expo_push_tokens")
    .select("user_id, expo_push_token")
    .in("user_id", [...recipientIds]);

  const messages: Record<string, unknown>[] = [];
  for (const t of tokenRows ?? []) {
    const token = (t as { expo_push_token: string }).expo_push_token?.trim();
    if (!token) continue;
    messages.push({
      to: token,
      title,
      body: msgBody,
      data: {
        href,
        pet_id: row.pet_id,
        activity_id: row.id,
        type: "co_carer_activity_logged",
      },
      sound: "default",
      channelId: "default",
      priority: "high",
    });
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!pushRes.ok) {
    const txt = await pushRes.text();
    console.error("[push-co-carer-activity] Expo error", pushRes.status, txt);
    return new Response(
      JSON.stringify({ error: "Push provider error", detail: txt.slice(0, 200) }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, sent: messages.length }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
