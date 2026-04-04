import { isCrittrProFromProfile } from "@/lib/crittrPro";
import { supabase } from "@/lib/supabase";

export type ProBillingParam = "monthly" | "annual";

export type SubscriptionPaymentSheetResponse = {
  customerId: string;
  subscriptionId: string;
  ephemeralKey: string;
  setupIntentClientSecret: string | null;
  paymentIntentClientSecret: string | null;
  billing: string;
};

/**
 * Calls Supabase Edge Function to create a trialing subscription and return
 * PaymentSheet secrets. Uses `supabase.functions.invoke` which attaches the
 * current session automatically — no manual token refresh or raw fetch needed.
 */
export async function fetchSubscriptionPaymentSheetParams(
  billing: ProBillingParam,
): Promise<SubscriptionPaymentSheetResponse> {
  const { data, error } = await supabase.functions.invoke(
    "create-subscription-payment-sheet",
    { body: { billing }, timeout: 30_000 },
  );

  if (error) {
    const msg = await extractErrorMessage(error);
    throw new Error(msg);
  }

  return data as SubscriptionPaymentSheetResponse;
}

/**
 * After PaymentSheet completes, poll the user's profile row until
 * `crittr_pro_until` is set (written by the Edge Function during subscription
 * creation or by the Stripe webhook). No second Edge Function call needed.
 */
export async function waitForProActivation(maxWaitMs = 12_000): Promise<void> {
  const start = Date.now();
  const pollInterval = 600;

  while (Date.now() - start < maxWaitMs) {
    if (await profileShowsActivePro()) {
      return;
    }
    await sleep(pollInterval);
  }

  if (await profileShowsActivePro()) {
    return;
  }

  throw new Error(
    "Your payment succeeded but Pro status hasn't synced yet. Pull to refresh or reopen the app.",
  );
}

async function profileShowsActivePro(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("crittr_pro_until")
    .eq("id", user.id)
    .maybeSingle();
  return isCrittrProFromProfile(data);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function extractErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === "object") {
    const e = error as { message?: string; context?: unknown };
    if (e.context instanceof Response) {
      try {
        const j = (await e.context.json()) as Record<string, unknown>;
        if (typeof j.message === "string") return j.message;
        if (typeof j.error === "string") return j.error;
      } catch {
        /* body already consumed */
      }
    }
    if (typeof e.message === "string" && e.message.length > 0) {
      return e.message;
    }
  }
  return "Something went wrong. Please try again.";
}
