import { supabase } from "@/lib/supabase";

export type SubscriptionDetails = {
  subscriptionId: string;
  status: string;
  planLabel: "annual" | "monthly";
  interval: "month" | "year" | null;
  priceFormatted: string;
  currency: string;
  startedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  paymentMethodLabel: string | null;
};

export type CancelSubscriptionResponse = {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  status: string;
};

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

async function invokeErrorBody(
  error: unknown,
  data: unknown,
): Promise<Record<string, unknown> | null> {
  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }
  if (error && typeof error === "object" && "context" in error) {
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try {
        return (await ctx.json()) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** `null` when the user has no Stripe subscription on file (not an error). */
export async function fetchSubscriptionDetails(): Promise<SubscriptionDetails | null> {
  const { data, error } = await supabase.functions.invoke(
    "get-subscription-details",
    { body: {}, timeout: 30_000 },
  );

  if (error) {
    const body = await invokeErrorBody(error, data);
    if (body?.error === "no_subscription") {
      return null;
    }
    throw new Error(await extractErrorMessage(error));
  }

  return data as SubscriptionDetails;
}

export async function cancelSubscriptionAtPeriodEnd(): Promise<CancelSubscriptionResponse> {
  const { data, error } = await supabase.functions.invoke("cancel-subscription", {
    body: {},
    timeout: 30_000,
  });

  if (error) {
    throw new Error(await extractErrorMessage(error));
  }

  return data as CancelSubscriptionResponse;
}

const DEFAULT_PORTAL_RETURN = "crittr://billing-return";

export async function createBillingPortalSession(
  returnUrl: string = DEFAULT_PORTAL_RETURN,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke(
    "create-billing-portal-session",
    { body: { returnUrl }, timeout: 30_000 },
  );

  if (error) {
    throw new Error(await extractErrorMessage(error));
  }

  const url = (data as { url?: string })?.url;
  if (!url) {
    throw new Error("Could not open billing portal.");
  }
  return url;
}
