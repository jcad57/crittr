import { supabase } from "@/lib/supabase";
import type { CrittrAiMessage } from "@/types/database";

export type CrittrAiThread = {
  conversationId: string | null;
  messages: CrittrAiMessage[];
};

async function extractInvokeErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === "object") {
    const e = error as { message?: string; context?: unknown };
    if (e.context instanceof Response) {
      try {
        const j = (await e.context.json()) as Record<string, unknown>;
        if (typeof j.message === "string") return j.message;
        if (typeof j.error === "string") return j.error;
      } catch {
        /* body consumed */
      }
    }
    if (typeof e.message === "string" && e.message.length > 0) {
      return e.message;
    }
  }
  return "Something went wrong. Please try again.";
}

/**
 * Deletes all CrittrAI conversations for the user (messages cascade). RLS: own rows only.
 * Next send creates a new conversation on the server.
 */
export async function deleteCrittrAiConversationsForUser(
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("crittr_ai_conversations")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("[crittrAi] delete conversations", error);
    throw new Error("Could not clear chat history.");
  }
}

/**
 * Latest CrittrAI thread for the user (by conversation updated_at). Empty when none yet.
 * History lives in Supabase + TanStack Query cache — not in the Anthropic dashboard.
 */
export async function fetchCrittrAiThread(userId: string): Promise<CrittrAiThread> {
  const { data: conv, error: convErr } = await supabase
    .from("crittr_ai_conversations")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (convErr) {
    console.error("[crittrAi] conversation", convErr);
    throw new Error("Could not load your CrittrAI chat.");
  }

  if (!conv?.id) {
    return { conversationId: null, messages: [] };
  }

  const { data: rows, error: msgErr } = await supabase
    .from("crittr_ai_messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true });

  if (msgErr) {
    console.error("[crittrAi] messages", msgErr);
    throw new Error("Could not load your CrittrAI messages.");
  }

  return {
    conversationId: conv.id,
    messages: (rows ?? []) as CrittrAiMessage[],
  };
}

export type CrittrAiChatResponse = {
  reply: string;
  conversation_id: string;
};

export async function invokeCrittrAiChat(params: {
  conversationId: string | null;
  message: string;
}): Promise<CrittrAiChatResponse> {
  const { data, error } = await supabase.functions.invoke("crittr-ai-chat", {
    body: {
      conversation_id: params.conversationId,
      message: params.message,
    },
    timeout: 120_000,
  });

  const payload = data as {
    error?: string;
    message?: string;
    reply?: string;
    conversation_id?: string;
  } | null;

  if (error) {
    const fromBody =
      typeof payload?.message === "string" && payload.message.length > 0
        ? payload.message
        : null;
    throw new Error(
      fromBody ?? (await extractInvokeErrorMessage(error)),
    );
  }

  if (payload?.error) {
    const msg =
      typeof payload.message === "string" ? payload.message : payload.error;
    throw new Error(msg);
  }

  if (
    typeof payload?.reply !== "string" ||
    typeof payload?.conversation_id !== "string"
  ) {
    throw new Error("Invalid response from CrittrAI.");
  }

  return {
    reply: payload.reply,
    conversation_id: payload.conversation_id,
  };
}
