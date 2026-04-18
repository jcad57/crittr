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
import { applyCrittrProDowngradeCleanup } from "../_shared/crittrProDowngradeCleanup.ts";
import { deriveCrittrProUntilForProfile } from "../_shared/crittrProEntitlement.ts";

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

async function resolveProfileUserId(
  admin: SupabaseClient,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const fromMeta = sub.metadata?.supabase_user_id;
  if (fromMeta) return fromMeta;

  const customerId = typeof sub.customer === "string"
    ? sub.customer
    : sub.customer.id;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (profile?.id) {
    return profile.id as string;
  }

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return null;
    const uid = customer.metadata?.supabase_user_id;
    return uid ?? null;
  } catch {
    return null;
  }
}

async function syncSubscription(admin: SupabaseClient, sub: Stripe.Subscription) {
  const userId = await resolveProfileUserId(admin, sub);
  if (!userId) {
    console.warn(
      "[stripe-webhook] cannot resolve Supabase user for subscription",
      sub.id,
    );
    return;
  }

  const proUntil = deriveCrittrProUntilForProfile(sub);
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
  const userId = await resolveProfileUserId(admin, sub);
  if (!userId) return;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  await applyCrittrProDowngradeCleanup(admin, userId);

  const { error } = await admin
    .from("profiles")
    .update({
      crittr_pro_until: null,
      stripe_subscription_id: null,
      stripe_customer_id: null,
    })
    .eq("id", userId);

  if (error) {
    console.error("[stripe-webhook] clear pro", error);
    throw error;
  }

  if (customerId) {
    try {
      await stripe.customers.del(customerId);
    } catch (e) {
      console.warn("[stripe-webhook] stripe customer delete (non-fatal)", e);
    }
  }
}
