/**
 * RevenueCat → Supabase webhook.
 *
 * Configure in https://app.revenuecat.com/projects → Integrations → Webhooks:
 *   URL: <project>.functions.supabase.co/revenuecat-webhook
 *   Authorization header: Bearer <REVENUECAT_WEBHOOK_AUTH>
 *
 * Deploy:
 *   supabase functions deploy revenuecat-webhook --no-verify-jwt
 *
 * Secrets:
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - REVENUECAT_SECRET_API_KEY  (used to fetch authoritative subscriber state)
 *   - REVENUECAT_WEBHOOK_AUTH    (shared secret)
 *
 * Behaviour:
 *  - Verifies the `Authorization` header matches `REVENUECAT_WEBHOOK_AUTH`.
 *  - Extracts the `app_user_id` from the event payload.
 *  - Re-fetches the authoritative subscriber state from the RevenueCat REST
 *    API and writes the resulting `crittr_pro_until` (and a few denormalized
 *    fields) onto `profiles`. We do not trust the event payload alone — if RC
 *    issues a refund or grace period, the subscriber GET is always correct.
 *  - On Pro→free transition, runs the downgrade cleanup (single living pet,
 *    co-care unwound, invites cleared).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { reconcileCrittrProForUser } from "../_shared/revenueCatEntitlement.ts";

type RevenueCatEvent = {
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  event_timestamp_ms?: number;
};

type RevenueCatWebhookBody = {
  event: RevenueCatEvent;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const expected = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  if (!expected) {
    console.error("[revenuecat-webhook] REVENUECAT_WEBHOOK_AUTH not set");
    return json({ error: "server_misconfigured" }, 500);
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.replace(/^Bearer\s+/i, "");
  if (provided !== expected) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: RevenueCatWebhookBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const event = body.event;
  if (!event?.app_user_id) {
    return json({ error: "missing_event" }, 400);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  /**
   * RevenueCat may emit the anonymous `$RCAnonymousID:...` for events fired
   * before the device called `Purchases.logIn`. In that case `aliases` /
   * `original_app_user_id` will contain the real Supabase user id (a UUID).
   */
  const candidates = [
    event.app_user_id,
    event.original_app_user_id ?? "",
    ...(event.aliases ?? []),
  ].filter(Boolean);
  const supabaseUserId = candidates.find(isUuid) ?? null;

  if (!supabaseUserId) {
    console.warn(
      "[revenuecat-webhook] no UUID app_user_id in event; skipping",
      event.type,
      event.app_user_id,
    );
    return json({ ok: true, skipped: "no_uuid_app_user_id" }, 200);
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", supabaseUserId)
    .maybeSingle();

  if (!profile) {
    console.warn(
      "[revenuecat-webhook] no matching profile for",
      supabaseUserId,
      event.type,
    );
    return json({ ok: true, skipped: "no_profile" }, 200);
  }

  try {
    const { before, after } = await reconcileCrittrProForUser(
      supabaseAdmin,
      supabaseUserId,
      event.app_user_id,
    );
    console.log(
      "[revenuecat-webhook]",
      event.type,
      "user",
      supabaseUserId,
      "pro:",
      before,
      "→",
      after,
    );
    return json({ ok: true, before, after }, 200);
  } catch (e) {
    console.error(
      "[revenuecat-webhook] reconcile failed",
      event.type,
      supabaseUserId,
      e,
    );
    return json({ error: "reconcile_failed", message: String(e) }, 500);
  }
});
