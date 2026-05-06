/**
 * Permanently delete the authenticated user's account:
 * - Best-effort delete the RevenueCat subscriber (purges PII / aliases)
 *   NOTE: This does NOT cancel an active App Store / Google Play subscription.
 *   Renewals are controlled by the user's Apple ID / Google account; we surface
 *   the native "Manage Subscription" link before deletion in the client.
 * - Remove avatar + known file-upload storage paths
 * - `auth.admin.deleteUser` → cascades profiles, pets, co-care rows, AI chats, etc.
 *
 * Deploy:
 *   supabase functions deploy delete-account --no-verify-jwt
 *
 * Secrets: SUPABASE_SERVICE_ROLE_KEY, REVENUECAT_SECRET_API_KEY (optional but recommended)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function deleteRevenueCatSubscriber(appUserId: string) {
  const apiKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!apiKey) {
    console.warn(
      "[delete-account] REVENUECAT_SECRET_API_KEY unset; skipping RevenueCat purge",
    );
    return;
  }
  const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`;
  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => "");
      console.warn(
        "[delete-account] RevenueCat delete subscriber failed:",
        res.status,
        body,
      );
    }
  } catch (e) {
    console.warn("[delete-account] RevenueCat delete subscriber error:", e);
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
    if (error)
      console.warn(`[delete-account] remove batch ${bucket}:`, error.message);
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
      .select("revenuecat_app_user_id")
      .eq("id", userId)
      .maybeSingle();

    const rcAppUserId =
      (profile as { revenuecat_app_user_id?: string | null } | null)
        ?.revenuecat_app_user_id ?? userId;
    await deleteRevenueCatSubscriber(rcAppUserId);

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
      if (medPaths.length)
        await removePaths(supabaseAdmin, "medical-records", medPaths);

      const { data: ins } = await supabaseAdmin
        .from("pet_insurance_files")
        .select("storage_path")
        .in("pet_id", petIds);
      const insPaths = (ins ?? [])
        .map((r: { storage_path: string }) => r.storage_path)
        .filter(Boolean);
      if (insPaths.length)
        await removePaths(supabaseAdmin, "pet-insurance", insPaths);
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
