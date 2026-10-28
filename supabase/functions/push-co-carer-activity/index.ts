/**
 * push-co-carer-activity
 *
 * After a co-carer logs an activity, the client invokes this with `{ activity_id }`.
 * Verifies the JWT matches `pet_activities.logged_by`, then wakes the durable
 * delivery queue for that activity. Database triggers choose recipients and
 * enqueue one job per registered device; the shared worker checks preferences,
 * access, tickets and receipts. Cron handles retries after the app closes.
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
import { processPushDeliveries } from "../_shared/processPushDeliveries.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ActivityRow = {
  id: string;
  pet_id: string;
  logged_by: string | null;
  label: string | null;
  vet_visit_id: string | null;
};

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
    .select("id, pet_id, logged_by, label, vet_visit_id")
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

  try {
    const result = await processPushDeliveries(admin, row.id, Deno.env.get("EXPO_ACCESS_TOKEN"));
    return Response.json({ ok: true, ...result }, { headers: corsHeaders });
  } catch (error) {
    console.error("[push-co-carer-activity] delivery deferred", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Delivery queued for retry" }, { status: 503, headers: corsHeaders });
  }
});
