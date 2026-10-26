/**
 * Fallback / safety-net entitlement sync.
 *
 * The primary entitlement-update path is `revenuecat-webhook`. When that
 * webhook is delayed (network blip, RC retry queue, sandbox flake), the
 * client may also call this function to immediately reconcile
 * `profiles.crittr_pro_until` with RevenueCat's current state.
 *
 * Deploy:
 *   supabase functions deploy sync-crittr-pro-entitlement
 *
 * Secrets:
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - REVENUECAT_SECRET_API_KEY
 *
 * Body: `{ "source"?: "session" | "checkout" }`. Identity is derived from the verified JWT.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import {
  ReconciliationBusyError,
  reconcileCrittrProForUser,
} from "../_shared/revenueCatEntitlement.ts";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser();
    if (userErr || !user) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json().catch(() => ({}))) as {
      appUserId?: string;
      source?: string;
      alternateAppUserIds?: unknown;
    };

    // Legacy app builds may include identity hints; never use them as authority.
    if (body.appUserId && body.appUserId !== user.id) {
      return json({ error: "subscriber_identity_mismatch" }, 400);
    }
    const { before, after } = await reconcileCrittrProForUser(
      supabaseAdmin,
      user.id,
      {
        checkout: ["checkout", "restore", "paywall"].includes(body.source ?? ""),
      },
    );

    return json({ ok: true, crittr_pro_until: after, previous: before }, 200);
  } catch (e) {
    if (e instanceof ReconciliationBusyError)
      return json({ error: "sync_in_progress" }, 429);
    console.error("[sync-crittr-pro-entitlement]", e);
    return json(
      {
        error: "internal_error",
        message: "Subscription verification is temporarily unavailable",
      },
      500,
    );
  }
});
