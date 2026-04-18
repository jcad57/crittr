/**
 * Fallback: re-fetch the Stripe subscription and write `crittr_pro_until`.
 * Primary path is `stripe-webhook` after payment method is on file; checkout
 * does not write Pro dates. This function exists for manual sync
 * or if the other two paths didn't fire in time.
 *
 * Deploy:
 *   supabase functions deploy sync-crittr-pro-entitlement
 */
// @ts-nocheck — Deno edge (`npm:`, `https://esm.sh`) is not typed by the app tsconfig.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "npm:stripe@17.7.0";
import { deriveCrittrProUntilForProfile } from "../_shared/crittrProEntitlement.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

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

    const body = await req.json().catch(() => ({}));
    const subscriptionIdFromClient =
      typeof body.subscriptionId === "string" ? body.subscriptionId.trim() : "";

    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id, crittr_pro_until")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      return json({ error: "profile_load_failed" }, 500);
    }

    let subId = profile?.stripe_subscription_id as string | null | undefined;
    const storedCustomerId = profile?.stripe_customer_id as
      | string
      | null
      | undefined;

    if (!subId && subscriptionIdFromClient.length > 0) {
      const candidate = await stripe.subscriptions.retrieve(
        subscriptionIdFromClient,
      );
      const candCust =
        typeof candidate.customer === "string"
          ? candidate.customer
          : candidate.customer.id;
      const metaUid = candidate.metadata?.supabase_user_id;
      const customerMatches =
        storedCustomerId != null && candCust === storedCustomerId;
      const userMatches = metaUid === user.id;
      if (!userMatches && !customerMatches) {
        return json(
          {
            error: "subscription_mismatch",
            message: "That subscription does not belong to this account.",
          },
          403,
        );
      }
      subId = candidate.id;
    }

    if (!subId && storedCustomerId) {
      const { data: subs } = await stripe.subscriptions.list({
        customer: storedCustomerId,
        status: "all",
        limit: 15,
      });
      const ranked = [...subs].sort((a, b) => b.created - a.created);
      const preferred = ranked.find((s) =>
        ["trialing", "active", "past_due"].includes(s.status)
      );
      subId = (preferred ?? ranked[0])?.id;
    }

    if (!subId) {
      return json(
        {
          error: "no_subscription",
          message: "No Stripe subscription on file.",
        },
        400,
      );
    }

    /** Expand PM so `shouldGrantCrittrProFromSubscription` sees trialing + saved card correctly. */
    const subscription = await stripe.subscriptions.retrieve(subId, {
      expand: ["default_payment_method"],
    });
    const proUntil = deriveCrittrProUntilForProfile(subscription);
    const stripeCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({
        crittr_pro_until: proUntil,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
      })
      .eq("id", user.id);

    if (upErr) {
      return json({ error: "update_failed" }, 500);
    }

    return json(
      { crittr_pro_until: proUntil, subscription_status: subscription.status },
      200,
    );
  } catch (e) {
    console.error("[sync-crittr-pro-entitlement]", e);
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});
