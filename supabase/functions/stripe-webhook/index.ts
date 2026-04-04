/**
 * Stripe → Supabase: sync Crittr Pro entitlement from subscription lifecycle.
 *
 * Configure in Stripe Dashboard → Webhooks → endpoint URL:
 *   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
 *
 * Events to send:
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *
 * Secrets:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET   — signing secret from the webhook endpoint
 *
 * Deploy (JWT must be off for Stripe):
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "npm:stripe@17.7.0";
import { computeCrittrProUntil } from "../_shared/crittrProEntitlement.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !webhookSecret) {
    return new Response(
      JSON.stringify({
        error: "missing_webhook_config",
        hint:
          "Set STRIPE_WEBHOOK_SECRET in Supabase Edge Function secrets to the signing secret from Stripe Dashboard → Webhooks → your endpoint (whsec_…).",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature", err);
    return new Response(
      JSON.stringify({
        error: "invalid_signature",
        hint:
          "STRIPE_WEBHOOK_SECRET must match the signing secret for this exact webhook URL in Stripe. Rotate the secret in Stripe and update Supabase if you recreated the endpoint.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(supabaseAdmin, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await clearPro(supabaseAdmin, sub);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe-webhook] handler", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

async function syncSubscription(admin: SupabaseClient, sub: Stripe.Subscription) {
  const userId = sub.metadata?.supabase_user_id;
  if (!userId) {
    console.warn("[stripe-webhook] missing supabase_user_id on subscription", sub.id);
    return;
  }

  const proUntil = computeCrittrProUntil(sub);
  const customerId = typeof sub.customer === "string"
    ? sub.customer
    : sub.customer.id;

  const { error } = await admin
    .from("profiles")
    .update({
      crittr_pro_until: proUntil,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
    })
    .eq("id", userId);

  if (error) {
    console.error("[stripe-webhook] profiles update", error);
    throw error;
  }
}

async function clearPro(admin: SupabaseClient, sub: Stripe.Subscription) {
  const userId = sub.metadata?.supabase_user_id;
  if (!userId) return;

  const { error } = await admin
    .from("profiles")
    .update({
      crittr_pro_until: null,
      stripe_subscription_id: null,
    })
    .eq("id", userId);

  if (error) {
    console.error("[stripe-webhook] clear pro", error);
    throw error;
  }
}
