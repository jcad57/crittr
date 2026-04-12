/**
 * Creates a Stripe Customer Billing Portal session (payment method + billing address).
 * Enable the Customer Portal in Stripe Dashboard → Settings → Billing → Customer portal.
 *
 * Deploy:
 *   supabase functions deploy create-billing-portal-session
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

/** Only allow app deep links — prevents open redirects. */
function portalReturnUrl(raw: unknown): string {
  const fallback = "crittr://billing-return";
  if (typeof raw !== "string" || raw.trim().length === 0) return fallback;
  const u = raw.trim();
  if (!u.startsWith("crittr://")) return fallback;
  return u;
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
    const returnUrl = portalReturnUrl(body.returnUrl);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const customerId = profile?.stripe_customer_id as string | null;
    if (!customerId) {
      return json(
        {
          error: "no_customer",
          message: "No billing account on file. Subscribe to Crittr Pro first.",
        },
        404,
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return json({ url: session.url }, 200);
  } catch (e) {
    console.error("[create-billing-portal-session]", e);
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});
