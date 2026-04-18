import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";

async function messageFromFunctionsError(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  try {
    const body = (await error.context.json()) as {
      error?: string;
      message?: string;
    };
    if (typeof body.message === "string" && body.message.length > 0) {
      return body.message;
    }
  } catch {
    /* non-JSON body */
  }
  return null;
}

export type FeedbackCategory = "bug" | "feature" | "general";

export type SubmitFeedbackInput = {
  subject: string;
  message: string;
  category: FeedbackCategory;
};

export type SubmitFeedbackResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; message: string };

export async function submitFeedback(
  input: SubmitFeedbackInput,
): Promise<SubmitFeedbackResult> {
  const subject = input.subject.trim();
  const message = input.message.trim();
  if (!message) {
    return { ok: false, message: "Please enter your feedback." };
  }

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    skipped?: boolean;
    error?: string;
    message?: string;
  }>("submit-feedback", {
    body: {
      subject: subject.length > 0 ? subject : "Crittr app feedback",
      message,
      category: input.category,
    },
  });

  if (error) {
    const fromBody = await messageFromFunctionsError(error);
    const fallback =
      typeof error.message === "string" && error.message.length > 0
        ? error.message
        : "Could not send feedback. Try again later.";
    return { ok: false, message: fromBody ?? fallback };
  }

  const payload = data as Record<string, unknown> | null;
  if (payload?.error === "unauthorized") {
    return { ok: false, message: "You need to be signed in to send feedback." };
  }
  if (payload?.error === "invalid_message") {
    return {
      ok: false,
      message:
        typeof payload.message === "string"
          ? payload.message
          : "Invalid message.",
    };
  }
  if (payload?.error === "invalid_from_config") {
    return {
      ok: false,
      message:
        typeof payload.message === "string"
          ? payload.message
          : "Email sender is misconfigured. Ask your developer to fix FROM_EMAIL.",
    };
  }
  if (payload?.error === "send_failed") {
    return {
      ok: false,
      message:
        typeof payload.message === "string"
          ? payload.message
          : "Email could not be sent.",
    };
  }
  if (payload?.ok === true) {
    return {
      ok: true,
      skipped: payload.skipped === true,
    };
  }

  return { ok: false, message: "Unexpected response from server." };
}
