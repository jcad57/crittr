/**
 * CrittrAI: authenticated + Crittr Pro users only. Persists messages and calls Anthropic.
 *
 * Secrets (Supabase Dashboard → Project Settings → Edge Functions → Secrets):
 *   ANTHROPIC_API_KEY — required
 *   CRITTR_AI_MODEL   — optional; default Haiku 4.5 (cheaper than Sonnet; override in secrets)
 *
 * Deploy:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *   supabase functions deploy crittr-ai-chat
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildCrittrPetContextForUser } from "../_shared/crittrAiPetContext.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Default: Claude Haiku 4.5 — lower cost than Sonnet for chat. Override via CRITTR_AI_MODEL secret.
 * Conversation history is stored in Supabase (not Anthropic); each request sends trimmed history + pet snapshot.
 */
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const MAX_USER_MESSAGE_CHARS = 4_000;
const MAX_CONTEXT_CHARS = 14_000;
/** Budget for the injected pet snapshot (owned + co-care); keeps history + system within model limits. */
const MAX_PET_CONTEXT_CHARS = 18_000;
/** Cap output length to control cost; raise via env later if needed. */
const MAX_OUTPUT_TOKENS = 1_536;

const SYSTEM_PROMPT_BASE = `You are CrittrAI, a friendly pet-care assistant inside the Crittr app. Help with daily routines, behavior, enrichment, training basics, and general wellness.

Rules:
- You are not a veterinarian. Never diagnose illness or prescribe treatment. For emergencies, severe symptoms, or anything worrying, tell the user to contact a veterinarian or emergency clinic immediately.
- Be concise and practical. Use Markdown when it helps readability: short headings (##), bullet lists, and **bold** for emphasis. The app renders Markdown natively.
- If the user asks for medical decisions, encourage professional veterinary advice.
- You will receive an up-to-date snapshot of their Crittr pet profiles after this paragraph. It includes every pet they own and every pet they co-care for (shared access). Prefer that snapshot when they ask about a specific pet by name or “my dog/cat”. If a detail is not in the snapshot, say it isn’t saved in Crittr yet and suggest they add it or confirm with their vet.
- Treat medications and vaccines in the snapshot as user-entered records for context only — not verified prescriptions. Never tell them to start, stop, or change meds; defer to their veterinarian.`;

function json(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type DbMsg = { role: string; content: string };

function trimForApi(messages: DbMsg[], maxChars: number): DbMsg[] {
  let total = 0;
  const out: DbMsg[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const len = messages[i].content.length;
    if (total + len > maxChars) break;
    out.unshift(messages[i]);
    total += len;
  }
  return out;
}

function toAnthropicMessages(
  rows: DbMsg[],
): { role: "user" | "assistant"; content: string }[] {
  const out = rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      role: r.role as "user" | "assistant",
      content: r.content,
    }));
  while (out.length > 0 && out[0].role === "assistant") {
    out.shift();
  }
  return out;
}

/** Anthropic requires alternating user/assistant; merge adjacent same-role turns. */
function mergeAdjacentSameRole(
  rows: { role: "user" | "assistant"; content: string }[],
): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const row of rows) {
    const last = out[out.length - 1];
    if (last && last.role === row.role) {
      last.content = `${last.content}\n\n${row.content}`;
    } else {
      out.push({ role: row.role, content: row.content });
    }
  }
  return out;
}

function parseAnthropicErrorBody(errText: string): string | null {
  try {
    const parsed = JSON.parse(errText) as {
      error?: { message?: string; type?: string };
      message?: string;
    };
    const m = parsed?.error?.message ?? parsed?.message;
    if (typeof m === "string" && m.length > 0 && m.length < 600) {
      return m;
    }
  } catch {
    /* not JSON */
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

    const { data: hasPro, error: proErr } = await supabaseAdmin.rpc(
      "user_has_crittr_pro",
      { check_user_id: user.id },
    );
    if (proErr) {
      console.error("[crittr-ai-chat] pro check", proErr);
      return json({ error: "pro_check_failed" }, 500);
    }
    if (!hasPro) {
      return json(
        {
          error: "pro_required",
          message: "CrittrAI is available with Crittr Pro.",
        },
        403,
      );
    }

    let body: { conversation_id?: string | null; message?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > MAX_USER_MESSAGE_CHARS) {
      return json(
        {
          error: "invalid_message",
          message: `Message must be 1–${MAX_USER_MESSAGE_CHARS} characters.`,
        },
        400,
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    if (!apiKey) {
      console.error("[crittr-ai-chat] missing ANTHROPIC_API_KEY");
      return json({ error: "server_misconfigured" }, 500);
    }

    const model = Deno.env.get("CRITTR_AI_MODEL") ?? DEFAULT_MODEL;

    let conversationId = typeof body.conversation_id === "string"
      ? body.conversation_id
      : null;

    if (conversationId) {
      const { data: conv, error: convErr } = await supabaseAdmin
        .from("crittr_ai_conversations")
        .select("id, user_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (convErr || !conv || conv.user_id !== user.id) {
        return json({ error: "invalid_conversation" }, 400);
      }
    } else {
      const { data: latest, error: latestErr } = await supabaseAdmin
        .from("crittr_ai_conversations")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestErr) {
        return json({ error: "conversation_load_failed" }, 500);
      }

      if (latest?.id) {
        conversationId = latest.id;
      } else {
        const { data: created, error: insErr } = await supabaseAdmin
          .from("crittr_ai_conversations")
          .insert({ user_id: user.id })
          .select("id")
          .single();
        if (insErr || !created?.id) {
          return json({ error: "conversation_create_failed" }, 500);
        }
        conversationId = created.id;
      }
    }

    const { data: history, error: histErr } = await supabaseAdmin
      .from("crittr_ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (histErr) {
      return json({ error: "history_load_failed" }, 500);
    }

    const { error: userInsErr } = await supabaseAdmin
      .from("crittr_ai_messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: message,
      });
    if (userInsErr) {
      console.error("[crittr-ai-chat] user insert", userInsErr);
      return json({ error: "save_failed" }, 500);
    }

    const withNewUser: DbMsg[] = [
      ...(history ?? []),
      { role: "user", content: message },
    ];
    const trimmed = trimForApi(withNewUser, MAX_CONTEXT_CHARS);
    let anthropicMessages = toAnthropicMessages(trimmed);
    anthropicMessages = mergeAdjacentSameRole(anthropicMessages);

    if (anthropicMessages.length === 0) {
      console.error("[crittr-ai-chat] empty message list for Anthropic");
      return json({ error: "invalid_context", message: "Could not build a valid chat context." }, 400);
    }

    const petContext = await buildCrittrPetContextForUser(
      supabaseAdmin,
      user.id,
      MAX_PET_CONTEXT_CHARS,
    );
    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${petContext}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: systemPrompt,
        messages: anthropicMessages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[crittr-ai-chat] anthropic", anthropicRes.status, errText);
      const upstreamHint = parseAnthropicErrorBody(errText);
      const message =
        upstreamHint ??
        "The AI service returned an error. Try again shortly.";
      return json(
        {
          error: "ai_upstream_error",
          message,
        },
        502,
      );
    }

    const anthropicJson = (await anthropicRes.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const textBlocks = (anthropicJson.content ?? []).filter(
      (b) => b.type === "text" && typeof b.text === "string",
    ) as Array<{ type: "text"; text: string }>;
    const reply = textBlocks.map((b) => b.text).join("\n").trim();
    if (!reply) {
      return json({ error: "empty_reply" }, 502);
    }

    const { error: asstInsErr } = await supabaseAdmin
      .from("crittr_ai_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: reply,
      });
    if (asstInsErr) {
      console.error("[crittr-ai-chat] assistant insert", asstInsErr);
      return json({ error: "save_failed" }, 500);
    }

    return json(
      {
        conversation_id: conversationId,
        reply,
      },
      200,
    );
  } catch (e) {
    console.error("[crittr-ai-chat]", e);
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});
