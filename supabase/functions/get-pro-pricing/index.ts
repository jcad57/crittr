/**
 * Returns Crittr Pro list prices (monthly + annual) from Stripe for in-app display.
 * Uses the same STRIPE_PRICE_ID_* env vars as create-subscription-payment-sheet.
 * No auth — amounts are public marketing data; Stripe secret stays server-side.
 *
 * Deploy:
 *   supabase functions deploy get-pro-pricing
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

function formatMinor(unitAmount: number, currency: string): string {
  const cur = currency.toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
    }).format(unitAmount / 100);
  } catch {
    return `${unitAmount / 100} ${cur}`;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const monthlyId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY");
    const annualId = Deno.env.get("STRIPE_PRICE_ID_ANNUAL");
    if (!monthlyId || !annualId) {
      return json({ error: "missing_stripe_price_env" }, 500);
    }

    const [monthlyPrice, annualPrice] = await Promise.all([
      stripe.prices.retrieve(monthlyId),
      stripe.prices.retrieve(annualId),
    ]);

    const mAmt = monthlyPrice.unit_amount;
    const aAmt = annualPrice.unit_amount;
    const mCur = (monthlyPrice.currency ?? "usd").toLowerCase();
    const aCur = (annualPrice.currency ?? "usd").toLowerCase();

    if (mAmt == null || aAmt == null) {
      return json(
        {
          error: "invalid_price",
          message: "Stripe prices must have fixed unit amounts.",
        },
        500,
      );
    }

    if (mCur !== aCur) {
      return json(
        {
          error: "currency_mismatch",
          message: "Monthly and annual prices must use the same currency.",
        },
        500,
      );
    }

    const currency = mCur;
    const monthlyYearTotal = mAmt * 12;
    const savingsVsMonthlyPercent =
      monthlyYearTotal > aAmt
        ? Math.round((1 - aAmt / monthlyYearTotal) * 100)
        : null;

    const equivalentMonthlyCents = Math.round(aAmt / 12);

    return json(
      {
        monthly: {
          priceId: monthlyPrice.id,
          unitAmount: mAmt,
          currency,
          formatted: formatMinor(mAmt, currency),
          interval: (monthlyPrice.recurring?.interval === "year"
            ? "year"
            : "month") as "month" | "year",
        },
        annual: {
          priceId: annualPrice.id,
          unitAmount: aAmt,
          currency,
          formatted: formatMinor(aAmt, currency),
          interval: (annualPrice.recurring?.interval === "month"
            ? "month"
            : "year") as "month" | "year",
          equivalentMonthlyFormatted: formatMinor(equivalentMonthlyCents, currency),
          savingsVsMonthlyPercent,
        },
      },
      200,
    );
  } catch (e) {
    console.error("[get-pro-pricing]", e);
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});
