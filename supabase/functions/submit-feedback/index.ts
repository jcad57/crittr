/**
 * Authenticated users submit in-app feedback; email is sent via Resend.
 *
 * Secrets:
 *   RESEND_API_KEY — required to send (same as send-co-care-invite)
 *   FROM_EMAIL     — verified sender (e.g. noreply@yourdomain.com)
 *   FEEDBACK_TO_EMAIL — optional; defaults to crittrsupport@gmail.com
 *
 * Deploy:
 *   supabase functions deploy submit-feedback
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@4.8.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TO = "crittrsupport@gmail.com";
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 8_000;
const MAX_CATEGORY = 80;

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

    let body: {
      subject?: unknown;
      message?: unknown;
      category?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const rawSubject =
      typeof body.subject === "string" ? body.subject.trim() : "";
    const subject =
      rawSubject.length > 0
        ? rawSubject.slice(0, MAX_SUBJECT)
        : "Crittr app feedback";

    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > MAX_MESSAGE) {
      return json(
        {
          error: "invalid_message",
          message: `Message must be 1–${MAX_MESSAGE} characters.`,
        },
        400,
      );
    }

    const categoryRaw =
      typeof body.category === "string" ? body.category.trim() : "";
    const category = categoryRaw
      ? categoryRaw.slice(0, MAX_CATEGORY)
      : null;

    const toEmail = Deno.env.get("FEEDBACK_TO_EMAIL")?.trim() || DEFAULT_TO;
    const fromEmail = Deno.env.get("FROM_EMAIL")?.trim() ?? "";
    const apiKey = Deno.env.get("RESEND_API_KEY")?.trim() ?? "";

    const userEmail = user.email ?? "—";

    if (!apiKey || !fromEmail) {
      console.warn(
        "[submit-feedback] Missing RESEND_API_KEY or FROM_EMAIL — skipping send.",
      );
      return json(
        {
          ok: true,
          skipped: true,
          reason: "email_not_configured",
        },
        200,
      );
    }

    const resend = new Resend(apiKey);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");
    const safeCategory = category ? escapeHtml(category) : null;

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;">
  <h2 style="margin:0 0 12px;">Crittr feedback</h2>
  <p style="margin:0 0 8px;"><strong>From account:</strong> ${escapeHtml(userEmail)}</p>
  <p style="margin:0 0 8px;"><strong>User id:</strong> ${escapeHtml(user.id)}</p>
  ${safeCategory ? `<p style="margin:0 0 8px;"><strong>Category:</strong> ${safeCategory}</p>` : ""}
  <p style="margin:0 0 8px;"><strong>Subject:</strong> ${safeSubject}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
  <div style="white-space:pre-wrap;">${safeMessage}</div>
</body></html>`;

    const { error: sendErr } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: user.email ?? undefined,
      subject: `[Crittr] ${subject}`,
      html,
    });

    if (sendErr) {
      console.error("[submit-feedback] Resend error:", sendErr);
      return json(
        { error: "send_failed", message: String(sendErr.message ?? sendErr) },
        502,
      );
    }

    return json({ ok: true }, 200);
  } catch (e) {
    console.error("[submit-feedback]", e);
    return json({ error: "internal_error" }, 500);
  }
});
