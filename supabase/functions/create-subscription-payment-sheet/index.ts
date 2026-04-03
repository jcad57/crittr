/**
 * Authenticated users only. Creates a Stripe Customer (if needed), a Crittr Pro
 * Subscription with a 7-day trial, and returns secrets for PaymentSheet
 * (SetupIntent and/or PaymentIntent + Ephemeral Key).
 *
 * Secrets (Supabase project → Edge Functions):
 *   STRIPE_SECRET_KEY
 *   STRIPE_PRICE_ID_MONTHLY   — recurring price for $4.99/mo (USD)
 *   STRIPE_PRICE_ID_ANNUAL    — recurring price for $39.99/yr (USD)
 *
 * Deploy:
 *   supabase functions deploy create-subscription-payment-sheet
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "npm:stripe@17.7.0";

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

    if (customerId) {
      const activeList = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 5,
      });
      const trialingList = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 5,
      });
      if (activeList.data.length > 0 || trialingList.data.length > 0) {
        return json(
          {
            error: "already_subscribed",
            message: "You already have an active Crittr Pro subscription.",
          },
          409,
        );
      }
    } else {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      const { error: upErr } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (upErr) {
        console.error("[create-subscription-payment-sheet] profile update", upErr);
      }
    }

    const incomplete = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
      limit: 10,
    });
    for (const s of incomplete.data) {
      await stripe.subscriptions.cancel(s.id);
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 7,
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_collection: "always",
      },
      metadata: { supabase_user_id: user.id },
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
    });

    const { error: subUpErr } = await supabaseAdmin
      .from("profiles")
      .update({ stripe_subscription_id: subscription.id })
      .eq("id", user.id);
    if (subUpErr) {
      console.error("[create-subscription-payment-sheet] subscription id update", subUpErr);
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2024-11-20.acacia" },
    );

    let setupIntentClientSecret: string | null = null;
    let paymentIntentClientSecret: string | null = null;

    const pending = subscription.pending_setup_intent;
    if (typeof pending === "string") {
      const si = await stripe.setupIntents.retrieve(pending);
      setupIntentClientSecret = si.client_secret;
    } else if (pending && typeof pending === "object" && pending.client_secret) {
      setupIntentClientSecret = pending.client_secret;
    }

    let invoice: Stripe.Invoice | null = null;
    if (typeof subscription.latest_invoice === "string") {
      invoice = await stripe.invoices.retrieve(subscription.latest_invoice, {
        expand: ["payment_intent"],
      });
    } else if (typeof subscription.latest_invoice === "object") {
      invoice = subscription.latest_invoice;
    }
    let paymentIntent: Stripe.PaymentIntent | string | null =
      invoice?.payment_intent ?? null;
    if (typeof paymentIntent === "string") {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntent);
    }
    if (paymentIntent && typeof paymentIntent === "object" && paymentIntent.client_secret) {
      paymentIntentClientSecret = paymentIntent.client_secret;
    }

    if (!setupIntentClientSecret && !paymentIntentClientSecret) {
      console.error(
        "[create-subscription-payment-sheet] no client secret",
        subscription.id,
      );
      return json(
        {
          error: "no_payment_secret",
          message: "Could not initialize payment. Try again or contact support.",
        },
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
