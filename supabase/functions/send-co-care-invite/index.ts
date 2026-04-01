/**
 * Supabase Edge Function: send-co-care-invite
 *
 * Sends a styled email to an unregistered user inviting them to download
 * the Crittr app and co-care for a pet. Expects a JSON body with:
 *   { inviterName: string, petName: string, inviteeEmail: string }
 *
 * Environment variables required:
 *   RESEND_API_KEY — API key for Resend (https://resend.com)
 *   FROM_EMAIL     — Verified sender address (e.g. noreply@crittr.app)
 *
 * Deploy:
 *   supabase functions deploy send-co-care-invite --no-verify-jwt
 *
 * Or restrict to authenticated calls by removing --no-verify-jwt and
 * passing the user's JWT in the Authorization header from the client.
 */

// @ts-ignore — Deno module resolution
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@crittr.app";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { inviterName, petName, inviteeEmail } = await req.json();

  if (!inviteeEmail) {
    return new Response(JSON.stringify({ error: "inviteeEmail is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const subject = `${inviterName ?? "Someone"} invited you to co-care for ${petName ?? "their pet"} on Crittr!`;

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
      <strong>${inviterName ?? "Someone"}</strong> wants you to co-care for
      <strong>${petName ?? "their pet"}</strong> on <strong>Crittr</strong>
      — the shared pet care app.
    </td></tr>
    <tr><td style="text-align:center;padding-bottom:32px;color:#6b7280;font-size:15px;line-height:1.5;">
      Download the app, sign up with <strong>${inviteeEmail}</strong>,
      and the invitation will be waiting for you.
    </td></tr>
    <tr><td style="text-align:center;padding-bottom:16px;">
      <a href="https://apps.apple.com" style="display:inline-block;background:#FC8D2C;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;">
        Download Crittr
      </a>
    </td></tr>
    <tr><td style="text-align:center;color:#9ca3af;font-size:12px;padding-top:32px;">
      If you didn't expect this email, you can safely ignore it.
    </td></tr>
  </table>
</body>
</html>`;

  if (!RESEND_API_KEY) {
    console.log("[send-co-care-invite] No RESEND_API_KEY — skipping email send.");
    console.log(`  To: ${inviteeEmail}, Subject: ${subject}`);
    return new Response(
      JSON.stringify({ ok: true, skipped: true, reason: "No RESEND_API_KEY configured" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
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
    const body = await res.text();
    console.error("[send-co-care-invite] Resend error:", res.status, body);
    return new Response(
      JSON.stringify({ error: "Failed to send email", detail: body }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const data = await res.json();
  return new Response(JSON.stringify({ ok: true, id: data.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
