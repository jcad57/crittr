/**
 * Creates a Stripe subscription and returns PaymentSheet secrets (SetupIntent /
 * PaymentIntent + Ephemeral Key).
 *
 * Intro: 7-day trial only for customers who have never had a Crittr Pro
 * subscription in Stripe (any status, including incomplete / canceled / abandoned
 * checkout). Returning subscribers pay from the first period.
 *
 * Optimized: parallelizes Stripe API calls where possible so the client sees
 * the PaymentSheet as fast as possible.
 *
 * Pro dates are written only after a payment method is on file (Stripe
 * webhooks + `deriveCrittrProUntilForProfile`), so abandoned checkouts do not
 * grant Pro or block retries.
 *
 * Deploy:
 *   supabase functions deploy create-subscription-payment-sheet
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "npm:stripe@17.7.0";
import { subscriptionHasDefaultPaymentMethod } from "../_shared/crittrProEntitlement.ts";

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

async function paymentMethodLabelForSubscription(
  subscriptionId: string,
): Promise<string | null> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method"],
  });
  const rawPm = subscription.default_payment_method;
  let pm: Stripe.PaymentMethod | null = null;
  if (typeof rawPm === "string") {
    try {
      pm = await stripe.paymentMethods.retrieve(rawPm);
    } catch {
      return null;
    }
  } else if (rawPm && typeof rawPm === "object") {
    pm = rawPm as Stripe.PaymentMethod;
  }
  if (pm?.type === "card" && pm.card) {
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

    const body = await req.json().catch(() => ({}));
    const billing = body.billing === "annual" ? "annual" : "monthly";
    const billingAnchorRaw =
      typeof body.billingAnchor === "string" ? body.billingAnchor.trim() : "";
    const promotionCodeRaw =
      typeof body.promotionCode === "string" ? body.promotionCode.trim() : "";
    const confirmSubscriptionResume =
      body.confirmSubscriptionResume === true ||
      body.confirmSubscriptionResume === "true";
    const createResumeCardSetupIntent =
      body.createResumeCardSetupIntent === true ||
      body.createResumeCardSetupIntent === "true";
    const finalizeResumeSetupIntentId =
      typeof body.finalizeResumeSetupIntentId === "string"
        ? body.finalizeResumeSetupIntentId.trim()
        : "";
    const previewIntroTrialOnly =
      body.previewIntroTrialOnly === true ||
      body.previewIntroTrialOnly === "true";
    const priceId =
      billing === "annual"
        ? Deno.env.get("STRIPE_PRICE_ID_ANNUAL")
        : Deno.env.get("STRIPE_PRICE_ID_MONTHLY");

    if (!priceId) {
      return json({ error: "missing_stripe_price_env" }, 500);
    }

    const priceIdAnnual = Deno.env.get("STRIPE_PRICE_ID_ANNUAL");
    const priceIdMonthly = Deno.env.get("STRIPE_PRICE_ID_MONTHLY");

    const isCrittrProPriceId = (pid: string | undefined): boolean => {
      if (!pid) return false;
      if (priceIdAnnual && pid === priceIdAnnual) return true;
      if (priceIdMonthly && pid === priceIdMonthly) return true;
      return false;
    };

    const subscriptionIsCrittrPro = (s: Stripe.Subscription): boolean => {
      if (s.metadata?.supabase_user_id === user.id) return true;
      return s.items.data.some((item) => isCrittrProPriceId(item.price?.id));
    };

    if (previewIntroTrialOnly) {
      const supabasePreview = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: previewProfile } = await supabasePreview
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle();
      const previewCid = previewProfile?.stripe_customer_id as string | null;
      if (!previewCid) {
        return json({ eligibleForIntroTrial: true, previewOnly: true }, 200);
      }
      const historicalPreview = await stripe.subscriptions.list({
        customer: previewCid,
        status: "all",
        limit: 100,
      });
      const hasPriorPreview = historicalPreview.data.some(subscriptionIsCrittrPro);
      return json(
        { eligibleForIntroTrial: !hasPriorPreview, previewOnly: true },
        200,
      );
    }

    let promotionCodeId: string | null = null;
    if (promotionCodeRaw.length > 0) {
      const variants = [
        promotionCodeRaw,
        promotionCodeRaw.toUpperCase(),
        promotionCodeRaw.toLowerCase(),
      ];
      const tried = new Set<string>();
      for (const code of variants) {
        if (tried.has(code)) continue;
        tried.add(code);
        const { data: promos } = await stripe.promotionCodes.list({
          code,
          active: true,
          limit: 1,
        });
        if (promos.length > 0) {
          promotionCodeId = promos[0]!.id;
          break;
        }
      }
      if (!promotionCodeId) {
        return json(
          {
            error: "invalid_promotion_code",
            message: "That promo code isn’t valid or is no longer active.",
          },
          400,
        );
      }
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

    // Drop abandoned checkouts (incomplete, or trialing/active with no PM yet),
    // then block only if a real subscription remains.
    const [incompleteList, trialingPre] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "incomplete", limit: 10 }),
      stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 20 }),
    ]);
    const cancelTargets = [
      ...incompleteList.data,
      ...trialingPre.data.filter((s) => !subscriptionHasDefaultPaymentMethod(s)),
    ];
    if (cancelTargets.length > 0) {
      await Promise.all(cancelTargets.map((s) => stripe.subscriptions.cancel(s.id)));
    }

    const [activeList, trialingList] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "active", limit: 20 }),
      stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 20 }),
    ]);

    const crittrSubs = [...activeList.data, ...trialingList.data].filter(
      subscriptionIsCrittrPro,
    );

    const fullyActiveCrittr = crittrSubs.filter((s) => !s.cancel_at_period_end);
    if (fullyActiveCrittr.length > 0) {
      return json(
        {
          error: "already_subscribed",
          message: "You already have an active Crittr Pro subscription.",
        },
        409,
      );
    }

    const pendingCancelSub = crittrSubs.find((s) => s.cancel_at_period_end);
    if (pendingCancelSub) {
      const subCurrency =
        typeof pendingCancelSub.currency === "string"
          ? pendingCancelSub.currency
          : "usd";

      if (createResumeCardSetupIntent) {
        const setupIntent = await stripe.setupIntents.create({
          customer: customerId,
          payment_method_types: ["card"],
          usage: "off_session",
          metadata: {
            supabase_user_id: user.id,
            crittr_resume_subscription_id: pendingCancelSub.id,
          },
        });
        const ephemeralKey = await stripe.ephemeralKeys.create(
          { customer: customerId },
          { apiVersion: "2024-11-20.acacia" },
        );
        if (!setupIntent.client_secret) {
          return json(
            {
              error: "no_setup_secret",
              message: "Could not start card update. Try again.",
            },
            500,
          );
        }
        return json(
          {
            resumeCardSetup: true,
            customerId,
            subscriptionId: pendingCancelSub.id,
            ephemeralKey: ephemeralKey.secret,
            setupIntentClientSecret: setupIntent.client_secret,
            setupIntentId: setupIntent.id,
            paymentIntentClientSecret: null,
            billing,
            amountDueCents: 0,
            currency: subCurrency,
          },
          200,
        );
      }

      if (confirmSubscriptionResume) {
        let defaultPmId: string | null = null;

        if (finalizeResumeSetupIntentId.length > 0) {
          const si = await stripe.setupIntents.retrieve(
            finalizeResumeSetupIntentId,
          );
          if (si.status !== "succeeded") {
            return json(
              {
                error: "setup_incomplete",
                message: "Payment method setup did not complete.",
              },
              400,
            );
          }
          const siCust = typeof si.customer === "string"
            ? si.customer
            : si.customer?.id;
          if (siCust !== customerId) {
            return json(
              { error: "forbidden", message: "Invalid payment setup." },
              403,
            );
          }
          const pm = si.payment_method;
          defaultPmId = typeof pm === "string"
            ? pm
            : pm && typeof pm === "object"
            ? (pm as Stripe.PaymentMethod).id
            : null;
          if (!defaultPmId) {
            return json(
              {
                error: "no_payment_method",
                message: "No payment method on file.",
              },
              400,
            );
          }
          await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: defaultPmId },
          });
        } else {
          const expanded = await stripe.subscriptions.retrieve(
            pendingCancelSub.id,
            { expand: ["default_payment_method"] },
          );
          if (!subscriptionHasDefaultPaymentMethod(expanded)) {
            return json(
              {
                error: "no_default_payment_method",
                message:
                  "Add a payment method before resuming your subscription.",
              },
              400,
            );
          }
        }

        const updateParams: Stripe.SubscriptionUpdateParams = {
          cancel_at_period_end: false,
        };
        if (defaultPmId) {
          updateParams.default_payment_method = defaultPmId;
        }
        if (promotionCodeId) {
          updateParams.discounts = [{ promotion_code: promotionCodeId }];
        }

        try {
          const updated = await stripe.subscriptions.update(
            pendingCancelSub.id,
            updateParams,
          );

          const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customerId },
            { apiVersion: "2024-11-20.acacia" },
          );

          return json(
            {
              resumed: true,
              customerId,
              subscriptionId: updated.id,
              ephemeralKey: ephemeralKey.secret,
              setupIntentClientSecret: null,
              paymentIntentClientSecret: null,
              billing,
              amountDueCents: 0,
              currency: typeof updated.currency === "string"
                ? updated.currency
                : subCurrency,
            },
            200,
          );
        } catch (e: unknown) {
          if (promotionCodeId && e && typeof e === "object" && "type" in e) {
            const se = e as { type?: string; message?: string };
            if (se.type === "StripeInvalidRequestError") {
              return json(
                {
                  error: "promotion_not_applicable",
                  message:
                    se.message ||
                    "This promo code can’t be applied to this subscription.",
                },
                400,
              );
            }
          }
          throw e;
        }
      }

      const paymentMethodLabel = await paymentMethodLabelForSubscription(
        pendingCancelSub.id,
      );
      const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: "2024-11-20.acacia" },
      );

      return json(
        {
          resumePaymentReview: true,
          paymentMethodLabel,
          customerId,
          subscriptionId: pendingCancelSub.id,
          ephemeralKey: ephemeralKey.secret,
          setupIntentClientSecret: null,
          paymentIntentClientSecret: null,
          billing,
          amountDueCents: 0,
          currency: subCurrency,
        },
        200,
      );
    }

    const nowSec = Math.floor(Date.now() / 1000);
    let customTrialEnd: number | null = null;
    const anchorMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(billingAnchorRaw);
    if (anchorMatch) {
      const y = Number(anchorMatch[1]);
      const mo = Number(anchorMatch[2]);
      const d = Number(anchorMatch[3]);
      if (
        y >= 2000 &&
        mo >= 1 &&
        mo <= 12 &&
        d >= 1 &&
        d <= 31
      ) {
        const endUtc = Math.floor(Date.UTC(y, mo - 1, d, 23, 59, 59) / 1000);
        if (endUtc > nowSec + 60) {
          customTrialEnd = endUtc;
        }
      }
    }

    const allHistoricalForIntroTrial = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    const hasPriorCrittrSubscription = allHistoricalForIntroTrial.data.some(
      subscriptionIsCrittrPro,
    );

    // Create subscription — expands both intents in one call
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      metadata: { supabase_user_id: user.id },
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
    };
    if (customTrialEnd != null) {
      subscriptionParams.trial_end = customTrialEnd;
    } else if (!hasPriorCrittrSubscription) {
      subscriptionParams.trial_period_days = 7;
    }
    if (promotionCodeId) {
      subscriptionParams.discounts = [{ promotion_code: promotionCodeId }];
    }

    let subscription: Stripe.Subscription;
    try {
      subscription = await stripe.subscriptions.create(subscriptionParams);
    } catch (e: unknown) {
      if (promotionCodeId && e && typeof e === "object" && "type" in e) {
        const se = e as { type?: string; message?: string };
        if (se.type === "StripeInvalidRequestError") {
          return json(
            {
              error: "promotion_not_applicable",
              message:
                se.message ||
                "This promo code can’t be applied to this subscription.",
            },
            400,
          );
        }
      }
      throw e;
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2024-11-20.acacia" },
    );

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
    const amountDueCents =
      typeof invoice?.amount_due === "number" ? invoice.amount_due : null;
    const invoiceCurrency =
      typeof invoice?.currency === "string" ? invoice.currency : null;
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

    const introTrialApplied =
      customTrialEnd == null && !hasPriorCrittrSubscription;

    return json(
      {
        customerId,
        subscriptionId: subscription.id,
        ephemeralKey: ephemeralKey.secret,
        setupIntentClientSecret,
        paymentIntentClientSecret,
        billing,
        amountDueCents,
        currency: invoiceCurrency,
        introTrialApplied,
      },
      200,
    );
  } catch (e) {
    console.error("[create-subscription-payment-sheet]", e);
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});
