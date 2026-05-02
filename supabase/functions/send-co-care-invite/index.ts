/**
 * Supabase Edge Function: send-co-care-invite
 *
 * Sends a styled email via Resend to a not-yet-registered email address so they
 * can download Crittr and sign up. Caller must be authenticated and own the pet.
 *
 * POST JSON body:
 *   { petId: string, inviteeEmail: string }
 *
 * Secrets (same as submit-feedback):
 *   RESEND_API_KEY
 *   FROM_EMAIL — verified domain in Resend
 *
 * Supabase injects SUPABASE_URL + SUPABASE_ANON_KEY for auth.getUser + RLS.
 *
 * Config: [functions.send-co-care-invite] verify_jwt = false in config.toml;
 * auth is enforced here via Bearer + getUser() (avoids gateway ES256 issues).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function singleLine(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

type PetInviteRow = { owner_id: string; name: string | null };
type ProfileInviteRow = { first_name: string | null };

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@crittr.app";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnon) {
    console.error(
      "[send-co-care-invite] Missing SUPABASE_URL or SUPABASE_ANON_KEY",
    );
    return json({ ok: false, error: "server_misconfigured" }, 500);
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser();
  if (userErr || !user) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: { petId?: unknown; inviteeEmail?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const petId = typeof body.petId === "string" ? body.petId.trim() : "";
  const inviteeRaw =
    typeof body.inviteeEmail === "string" ? body.inviteeEmail : "";
  const inviteeEmail = inviteeRaw.trim().toLowerCase();

  if (!petId || !inviteeEmail) {
    return json({ error: "petId_and_inviteeEmail_required" }, 400);
  }

  const { data: petRaw, error: petErr } = await supabaseUser
    .from("pets")
    .select("owner_id, name")
    .eq("id", petId)
    .single();

  const pet = petRaw as PetInviteRow | null;
  if (petErr || !pet || pet.owner_id !== user.id) {
    return json({ error: "forbidden" }, 403);
  }

  const { data: profileRaw } = await supabaseUser
    .from("profiles")
    .select("first_name")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as ProfileInviteRow | null;
  const inviterFirst =
    typeof profile?.first_name === "string"
      ? profile.first_name.trim()
      : "";
  const inviterName = singleLine(inviterFirst.length > 0 ? inviterFirst : "Someone");
  const petName = singleLine(pet.name?.trim() || "their pet");

  const subject = singleLine(
    `${inviterName} invited you to co-care for ${petName} on Crittr!`,
  );

  const safeInviter = escapeHtml(inviterName);
  const safePet = escapeHtml(petName);
  const safeEmail = escapeHtml(inviteeEmail);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#FDF8F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <tr><td style="text-align:center;padding-bottom:24px;">
      <span style="font-size:36px;">🐾</span>
    </td></tr>
    <tr><td style="text-align:center;padding-bottom:16px;">
      <h1 style="font-size:24px;color:#111827;margin:0;">You're invited!</h1>
    </td></tr>
    <tr><td style="text-align:center;padding-bottom:24px;color:#6b7280;font-size:16px;line-height:1.5;">
      <strong>${safeInviter}</strong> wants you to co-care for
      <strong>${safePet}</strong> on <strong>Crittr</strong>
      — the shared pet care app.
    </td></tr>
    <tr><td style="text-align:center;padding-bottom:32px;color:#6b7280;font-size:15px;line-height:1.5;">
      Download the app, sign up with <strong>${safeEmail}</strong>,
      and the invitation will be waiting for you.
    </td></tr>
    <tr><td style="text-align:center;padding-bottom:16px;">
      <a href="https://apps.apple.com" style="display:inline-block;background:#FC8D2C;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;">
        Download Crittr (iOS)
      </a>
    </td></tr>
    <tr><td style="text-align:center;color:#9ca3af;font-size:12px;padding-top:32px;">
      If you didn't expect this email, you can safely ignore it.
    </td></tr>
  </table>
</body>
</html>`;

  if (!RESEND_API_KEY) {
    console.error("[send-co-care-invite] RESEND_API_KEY is not set");
    return json({ ok: false, error: "resend_not_configured" }, 503);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [inviteeEmail],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("[send-co-care-invite] Resend error:", res.status, detail);
    return json(
      { ok: false, error: "resend_failed", detail: detail.slice(0, 500) },
      502,
    );
  }

  const sendResult = (await res.json()) as { id?: string };
  return json({ ok: true, id: sendResult.id ?? null }, 200);
});
