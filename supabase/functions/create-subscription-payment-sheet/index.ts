/**
 * Creates a Stripe subscription with a 7-day trial and returns PaymentSheet
 * secrets (SetupIntent / PaymentIntent + Ephemeral Key).
 *
 * Optimized: parallelizes Stripe API calls where possible so the client sees
 * the PaymentSheet as fast as possible.
 *
 * Writes `crittr_pro_until` immediately so the client only needs a DB read
 * after payment — no second Edge Function call required.
 *
 * Deploy:
 *   supabase functions deploy create-subscription-payment-sheet
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "npm:stripe@17.7.0";
import { computeCrittrProUntil } from "../_shared/crittrProEntitlement.ts";

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

    const body = await req.json().catch(() => ({}));
    const billing = body.billing === "annual" ? "annual" : "monthly";
    const priceId =
      billing === "annual"
        ? Deno.env.get("STRIPE_PRICE_ID_ANNUAL")
        : Deno.env.get("STRIPE_PRICE_ID_MONTHLY");

    if (!priceId) {
      return json({ error: "missing_stripe_price_env" }, 500);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Check for existing active/trialing and clean up incomplete — in parallel
    const [activeList, trialingList, incompleteList] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 }),
      stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 }),
      stripe.subscriptions.list({ customer: customerId, status: "incomplete", limit: 10 }),
    ]);

    if (activeList.data.length > 0 || trialingList.data.length > 0) {
      return json(
        { error: "already_subscribed", message: "You already have an active Crittr Pro subscription." },
        409,
      );
    }

    // Cancel stale incomplete subscriptions in parallel
    if (incompleteList.data.length > 0) {
      await Promise.all(incompleteList.data.map((s) => stripe.subscriptions.cancel(s.id)));
    }

    // Create subscription — expands both intents in one call
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 7,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      metadata: { supabase_user_id: user.id },
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
    });

    // Write subscription + pro date to profile, create ephemeral key — in parallel
    const proUntil = computeCrittrProUntil(subscription);
    const [, ephemeralKey] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .update({
          stripe_subscription_id: subscription.id,
          crittr_pro_until: proUntil,
        })
        .eq("id", user.id),
      stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: "2024-11-20.acacia" },
      ),
    ]);

    // Extract client secrets from the already-expanded objects (no extra API calls)
    let setupIntentClientSecret: string | null = null;
    let paymentIntentClientSecret: string | null = null;

    const pending = subscription.pending_setup_intent;
    if (typeof pending === "string") {
      const si = await stripe.setupIntents.retrieve(pending);
      setupIntentClientSecret = si.client_secret;
    } else if (pending && typeof pending === "object" && pending.client_secret) {
      setupIntentClientSecret = pending.client_secret;
    }

    const invoice =
      typeof subscription.latest_invoice === "object"
        ? subscription.latest_invoice
        : null;
    const pi = invoice?.payment_intent ?? null;
    if (pi && typeof pi === "object" && pi.client_secret) {
      paymentIntentClientSecret = pi.client_secret;
    }

    if (!setupIntentClientSecret && !paymentIntentClientSecret) {
      console.error("[create-subscription-payment-sheet] no client secret", subscription.id);
      return json(
        { error: "no_payment_secret", message: "Could not initialize payment. Try again or contact support." },
        500,
      );
    }

    return json(
      {
        customerId,
        subscriptionId: subscription.id,
        ephemeralKey: ephemeralKey.secret,
        setupIntentClientSecret,
        paymentIntentClientSecret,
        billing,
      },
      200,
    );
  } catch (e) {
    console.error("[create-subscription-payment-sheet]", e);
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});
