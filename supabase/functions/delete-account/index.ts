/**
 * Permanently delete the authenticated user's account:
 * - Cancel all Crittr Pro Stripe subscriptions for this user (profile subscription id
 *   plus any others on the same Stripe customer when present)
 * - Remove avatar + known file-upload storage paths
 * - `auth.admin.deleteUser` → cascades profiles, pets, co-care rows, AI chats, etc.
 *
 * Deploy:
 *   supabase functions deploy delete-account --no-verify-jwt
 *
 * Secrets: SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY (recommended for Pro users)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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

/** Statuses where `subscriptions.cancel` still applies (terminal ones are skipped). */
const CANCELABLE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

function subscriptionBelongsToAccount(
  sub: Stripe.Subscription,
  userId: string,
  profileCustomerId: string | null | undefined,
): boolean {
  const metaUid = sub.metadata?.supabase_user_id;
  if (metaUid && metaUid !== userId) return false;

  const cust =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (profileCustomerId && cust && cust !== profileCustomerId) {
    return false;
  }

  if (metaUid === userId) return true;
  if (profileCustomerId && cust === profileCustomerId) return true;
  return false;
}

async function cancelAllStripeSubscriptionsForAccount(
  userId: string,
  profile: {
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    crittr_pro_until: string | null;
  } | null,
) {
  if (!Deno.env.get("STRIPE_SECRET_KEY")) {
    console.warn("[delete-account] STRIPE_SECRET_KEY unset; skipping Stripe");
    return;
  }

  const storedSubId = profile?.stripe_subscription_id?.trim() || null;
  const customerId = profile?.stripe_customer_id?.trim() || null;

  const subIds = new Set<string>();

  if (storedSubId) {
    try {
      const sub = await stripe.subscriptions.retrieve(storedSubId);
      if (
        subscriptionBelongsToAccount(sub, userId, customerId) &&
        CANCELABLE_STATUSES.has(sub.status)
      ) {
        subIds.add(sub.id);
      }
    } catch (e) {
      console.warn("[delete-account] retrieve stored subscription:", e);
    }
  }

  if (customerId) {
    try {
      const { data: list } = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 30,
      });
      for (const s of list) {
        if (!CANCELABLE_STATUSES.has(s.status)) continue;
        if (subscriptionBelongsToAccount(s, userId, customerId)) {
          subIds.add(s.id);
        }
      }
    } catch (e) {
      console.warn("[delete-account] list subscriptions:", e);
    }
  }

  for (const id of subIds) {
    try {
      await stripe.subscriptions.cancel(id);
      console.log("[delete-account] canceled subscription", id);
    } catch (e) {
      console.warn("[delete-account] cancel subscription", id, e);
    }
  }

  if (
    subIds.size === 0 &&
    profile?.crittr_pro_until &&
    new Date(profile.crittr_pro_until) > new Date() &&
    !storedSubId &&
    !customerId
  ) {
    console.warn(
      "[delete-account] Active Pro in DB but no Stripe customer/subscription ids; cannot cancel billing remotely",
    );
  }
}

function json(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function removeFlatPrefix(
  admin: SupabaseClient,
  bucket: string,
  folder: string,
) {
  const { data, error } = await admin.storage.from(bucket).list(folder, {
    limit: 1000,
  });
  if (error) {
    console.warn(`[delete-account] list ${bucket}/${folder}:`, error.message);
    return;
  }
  const paths = (data ?? []).map((f) => `${folder}/${f.name}`);
  if (paths.length === 0) return;
  const { error: remErr } = await admin.storage.from(bucket).remove(paths);
  if (remErr) {
    console.warn(`[delete-account] remove ${bucket}:`, remErr.message);
  }
}

async function removePaths(
  admin: SupabaseClient,
  bucket: string,
  paths: string[],
) {
  const chunk = 100;
  for (let i = 0; i < paths.length; i += chunk) {
    const slice = paths.slice(i, i + chunk);
    const { error } = await admin.storage.from(bucket).remove(slice);
    if (error) console.warn(`[delete-account] remove batch ${bucket}:`, error.message);
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

    const userId = user.id;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id, crittr_pro_until")
      .eq("id", userId)
      .maybeSingle();

    await cancelAllStripeSubscriptionsForAccount(userId, profile ?? null);

    await removeFlatPrefix(supabaseAdmin, "avatars", userId);
    await removeFlatPrefix(supabaseAdmin, "avatars", `pets/${userId}`);

    const { data: ownedPets } = await supabaseAdmin
      .from("pets")
      .select("id")
      .eq("owner_id", userId);
    const petIds = (ownedPets ?? []).map((p: { id: string }) => p.id);

    if (petIds.length > 0) {
      const { data: med } = await supabaseAdmin
        .from("pet_medical_record_uploads")
        .select("storage_path")
        .in("pet_id", petIds);
      const medPaths = (med ?? [])
        .map((r: { storage_path: string }) => r.storage_path)
        .filter(Boolean);
      if (medPaths.length) await removePaths(supabaseAdmin, "medical-records", medPaths);

      const { data: ins } = await supabaseAdmin
        .from("pet_insurance_files")
        .select("storage_path")
        .in("pet_id", petIds);
      const insPaths = (ins ?? [])
        .map((r: { storage_path: string }) => r.storage_path)
        .filter(Boolean);
      if (insPaths.length) await removePaths(supabaseAdmin, "pet-insurance", insPaths);
    }

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error("[delete-account] admin.deleteUser:", delErr);
      return json(
        {
          error: "delete_failed",
          message: delErr.message ?? "Could not delete account.",
        },
        500,
      );
    }

    return json({ ok: true }, 200);
  } catch (e) {
    console.error("[delete-account]", e);
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});
