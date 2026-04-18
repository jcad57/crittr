/**
 * Authenticated users submit in-app feedback; email is sent via Resend.
 *
 * Secrets:
 *   RESEND_API_KEY — required to send (same as send-co-care-invite)
 *   FROM_EMAIL     — must be on a domain verified in Resend (e.g. noreply@crittrapp.com).
 *                    Do not use @gmail.com / personal addresses — Resend will reject them.
 *   FEEDBACK_TO_EMAIL — optional override for the support inbox; omit in production so mail
 *                    goes to support@crittrapp.com (not a personal Gmail).
 *
 * Deploy:
 *   supabase functions deploy submit-feedback
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TO = "support@crittrapp.com";
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

/** `from` may be `email@x.com` or `Name <email@x.com>` (Resend accepts both). */
function emailAddressFromFromHeader(from: string): string {
  const t = from.trim();
  const m = t.match(/<([^>]+)>\s*$/);
  return (m ? m[1] : t).trim();
}

const PERSONAL_FROM_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

function personalDomainErrorForFrom(fromHeader: string): string | null {
  const addr = emailAddressFromFromHeader(fromHeader);
  const at = addr.lastIndexOf("@");
  if (at < 1 || at === addr.length - 1) return null;
  const domain = addr.slice(at + 1).toLowerCase();
  if (!PERSONAL_FROM_DOMAINS.has(domain)) return null;
  return (
    "FROM_EMAIL is set to a personal address (" + domain +
    "). Set the submit-feedback secret FROM_EMAIL to an address on your Resend-verified domain " +
    "(e.g. noreply@crittrapp.com). The user's Gmail is only used as Reply-To, not as the sender."
  );
}

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
};

type PetRow = {
  id: string;
  name: string;
  pet_type: string | null;
  is_memorialized: boolean | null;
};

function profileDisplayName(profile: ProfileRow | null): string | null {
  if (!profile) return null;
  const d = profile.display_name?.trim();
  if (d) return d;
  const fn = profile.first_name?.trim() ?? "";
  const ln = profile.last_name?.trim() ?? "";
  const full = `${fn} ${ln}`.trim();
  return full.length > 0 ? full : null;
}

function metaString(
  obj: Record<string, unknown> | null | undefined,
  keys: string[],
): string | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 0) return t;
    }
  }
  return null;
}

/** Prefer `profiles` row; many accounts only have names in auth metadata (OAuth / signup). */
function feedbackDisplayName(
  user: {
    user_metadata?: Record<string, unknown> | null;
    identities?: Array<{ identity_data?: Record<string, unknown> | null }> | null;
  },
  profile: ProfileRow | null,
): string | null {
  const fromProfile = profileDisplayName(profile);
  if (fromProfile) return fromProfile;

  const meta = user.user_metadata ?? undefined;
  const single = metaString(meta, ["full_name", "name", "display_name"]);
  if (single) return single;

  const fn = metaString(meta, ["first_name", "given_name"]) ?? "";
  const ln = metaString(meta, ["last_name", "family_name"]) ?? "";
  const combined = `${fn} ${ln}`.trim();
  if (combined.length > 0) return combined;

  const identities = user.identities;
  if (Array.isArray(identities)) {
    for (const ident of identities) {
      const data = ident?.identity_data;
      if (!data || typeof data !== "object") continue;
      const idSingle = metaString(data, ["full_name", "name", "display_name"]);
      if (idSingle && !idSingle.includes("@")) return idSingle;
      const ifn = metaString(data, ["first_name", "given_name"]) ?? "";
      const iln = metaString(data, ["last_name", "family_name"]) ?? "";
      const icomb = `${ifn} ${iln}`.trim();
      if (icomb.length > 0) return icomb;
    }
  }

  return null;
}

function petsTableHtml(
  pets: PetRow[],
  loadError: boolean,
): string {
  if (loadError) {
    return `<p style="margin:16px 0 0;color:#b45309;font-size:14px;">Pet list could not be loaded.</p>`;
  }
  if (pets.length === 0) {
    return `<p style="margin:16px 0 0;color:#6b7280;font-size:14px;">No pets on this account.</p>`;
  }
  const rows = pets
    .map((p) => {
      const mem = p.is_memorialized
        ? ' <span style="color:#6b7280;font-weight:400;">(memorialized)</span>'
        : "";
      const type = p.pet_type ? escapeHtml(p.pet_type.replace(/_/g, " ")) : "—";
      return `<tr>
  <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(p.name)}${mem}</td>
  <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;">${escapeHtml(p.id)}</td>
  <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${type}</td>
</tr>`;
    })
    .join("\n");
  return `
  <h3 style="margin:24px 0 10px;font-size:15px;color:#111827;">Pets (they own)</h3>
  <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Use pet id in Supabase or support tools. Co-carer pets are not listed here.</p>
  <table style="border-collapse:collapse;width:100%;max-width:640px;font-size:14px;" cellpadding="0" cellspacing="0">
    <thead><tr style="background:#f9fafb;">
      <th align="left" style="padding:10px 12px;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;">Name</th>
      <th align="left" style="padding:10px 12px;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;">Pet id</th>
      <th align="left" style="padding:10px 12px;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;">Type</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
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

    const fromMisconfig = personalDomainErrorForFrom(fromEmail);
    if (fromMisconfig) {
      console.error("[submit-feedback]", fromMisconfig);
      return json({ error: "invalid_from_config", message: fromMisconfig }, 400);
    }

    console.log(
      `[submit-feedback] Resend: to=${toEmail} from=${emailAddressFromFromHeader(fromEmail)}`,
    );

    const [{ data: profileRow, error: profileErr }, { data: petsRows, error: petsErr }] =
      await Promise.all([
        supabaseAuth
          .from("profiles")
          .select("first_name,last_name,display_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabaseAuth
          .from("pets")
          .select("id,name,pet_type,is_memorialized")
          .eq("owner_id", user.id)
          .order("name", { ascending: true }),
      ]);

    if (profileErr) {
      console.warn("[submit-feedback] profile select:", profileErr.message);
    }
    if (petsErr) {
      console.warn("[submit-feedback] pets select:", petsErr.message);
    }

    const profileName = feedbackDisplayName(
      user,
      profileErr ? null : (profileRow as ProfileRow | null),
    );
    const pets = (petsErr ? [] : (petsRows ?? [])) as PetRow[];
    const petsBlock = petsTableHtml(pets, Boolean(petsErr));

    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");
    const safeCategory = category ? escapeHtml(category) : null;
    const safeProfileName = profileName ? escapeHtml(profileName) : "—";

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827;max-width:720px;">
  <h2 style="margin:0 0 16px;font-size:20px;">Crittr feedback</h2>

  <div style="background:#f9fafb;border-radius:12px;padding:16px 18px;margin:0 0 20px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">User</p>
    <p style="margin:0 0 4px;"><strong>Name:</strong> ${safeProfileName}</p>
    <p style="margin:0 0 4px;"><strong>Account email:</strong> ${escapeHtml(userEmail)}</p>
    <p style="margin:0;"><strong>User id:</strong> <span style="font-family:ui-monospace,monospace;font-size:13px;">${escapeHtml(user.id)}</span></p>
  </div>

  ${safeCategory ? `<p style="margin:0 0 8px;"><strong>Category:</strong> ${safeCategory}</p>` : ""}
  <p style="margin:0 0 8px;"><strong>Subject:</strong> ${safeSubject}</p>

  ${petsBlock}

  <h3 style="margin:24px 0 10px;font-size:15px;color:#111827;">Message</h3>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 14px;"/>
  <div style="white-space:pre-wrap;font-size:15px;">${safeMessage}</div>
</body></html>`;

    /** Direct HTTP call — matches send-co-care-invite; avoids Deno issues with npm:resend. */
    const resendBody: Record<string, unknown> = {
      from: fromEmail,
      to: [toEmail],
      subject: `[Crittr] ${subject}`,
      html,
    };
    if (user.email) {
      resendBody.reply_to = user.email;
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendBody),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error("[submit-feedback] Resend error:", resendRes.status, detail);
      let errMessage = "Email could not be sent.";
      try {
        const parsed = JSON.parse(detail) as { message?: string };
        if (typeof parsed.message === "string" && parsed.message.length > 0) {
          errMessage = parsed.message;
        }
      } catch {
        /* use default */
      }
      return json({ error: "send_failed", message: errMessage }, 502);
    }

    return json({ ok: true }, 200);
  } catch (e) {
    console.error("[submit-feedback]", e);
    return json({ error: "internal_error" }, 500);
  }
});
