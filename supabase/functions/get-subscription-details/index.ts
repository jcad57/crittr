/**
 * Returns Crittr Pro subscription details from Stripe for the signed-in user.
 *
 * Deploy:
 *   supabase functions deploy get-subscription-details
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

function isoFromUnix(sec: number | null | undefined): string | null {
  if (sec == null || sec <= 0) return null;
  return new Date(sec * 1000).toISOString();
}

function formatMoney(
  unitAmount: number | null | undefined,
  currency: string | null | undefined,
  interval: "month" | "year" | null,
): string {
  if (unitAmount == null || !currency) return "—";
  const amount = unitAmount / 100;
  const cur = currency.toUpperCase();
  try {
    const base = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
    }).format(amount);
    if (interval === "year") return `${base} / year`;
    if (interval === "month") return `${base} / month`;
    return base;
  } catch {
    return `${amount} ${cur}`;
  }
}

function paymentMethodLabel(pm: Stripe.PaymentMethod | null): string | null {
  if (!pm) return null;
  if (pm.type === "card" && pm.card) {
    const brand = pm.card.brand
      ? pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)
      : "Card";
    return `${brand} · ${pm.card.last4}`;
  }
  return null;
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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    let subId = profile?.stripe_subscription_id as string | null;
    const customerId = profile?.stripe_customer_id as string | null;

    if (!subId && customerId) {
      const [active, trialing] = await Promise.all([
        stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        }),
        stripe.subscriptions.list({
          customer: customerId,
          status: "trialing",
          limit: 1,
        }),
      ]);
      subId =
        active.data[0]?.id ??
        trialing.data[0]?.id ??
        null;
    }

    if (!subId) {
      return json({ error: "no_subscription", message: "No subscription on file." }, 404);
    }

    const subscription = await stripe.subscriptions.retrieve(subId, {
      expand: ["items.data.price", "default_payment_method"],
    });

    const metaUid = subscription.metadata?.supabase_user_id;
    if (metaUid && metaUid !== user.id) {
      return json({ error: "forbidden" }, 403);
    }

    const item = subscription.items.data[0];
    const price = item?.price;
    const recurring = price?.recurring;
    const interval = recurring?.interval === "year"
      ? "year"
      : recurring?.interval === "month"
      ? "month"
      : null;

    const priceIdAnnual = Deno.env.get("STRIPE_PRICE_ID_ANNUAL");
    const priceIdMonthly = Deno.env.get("STRIPE_PRICE_ID_MONTHLY");
    let planLabel: "annual" | "monthly" = "monthly";
    if (price?.id && priceIdAnnual && price.id === priceIdAnnual) {
      planLabel = "annual";
    } else if (price?.id && priceIdMonthly && price.id === priceIdMonthly) {
      planLabel = "monthly";
    } else if (interval === "year") {
      planLabel = "annual";
    }

    const unitAmount = price?.unit_amount ?? null;
    const currency = price?.currency ?? "usd";

    let pm: Stripe.PaymentMethod | null = null;
    const rawPm = subscription.default_payment_method;
    if (typeof rawPm === "string") {
      pm = await stripe.paymentMethods.retrieve(rawPm);
    } else if (rawPm && typeof rawPm === "object") {
      pm = rawPm as Stripe.PaymentMethod;
    }

    return json(
      {
        subscriptionId: subscription.id,
        status: subscription.status,
        planLabel,
        interval,
        priceFormatted: formatMoney(unitAmount, currency, interval),
        currency,
        startedAt: isoFromUnix(subscription.start_date),
        currentPeriodStart: isoFromUnix(subscription.current_period_start),
        currentPeriodEnd: isoFromUnix(subscription.current_period_end),
        trialStart: isoFromUnix(subscription.trial_start),
        trialEnd: isoFromUnix(subscription.trial_end),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: isoFromUnix(subscription.canceled_at),
        paymentMethodLabel: paymentMethodLabel(pm),
      },
      200,
    );
  } catch (e) {
    console.error("[get-subscription-details]", e);
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});
