import { supabase } from "@/lib/supabase";

export type ProPricingTier = {
  priceId: string;
  unitAmount: number;
  currency: string;
  formatted: string;
  interval: "month" | "year";
};

export type ProPricing = {
  monthly: ProPricingTier;
  annual: ProPricingTier & {
    equivalentMonthlyFormatted: string;
    savingsVsMonthlyPercent: number | null;
  };
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

/**
 * Fetches monthly/annual Pro list prices from Stripe (via Edge Function).
 * Safe to call unauthenticated — no user-specific data.
 */
export async function fetchProPricing(): Promise<ProPricing> {
  const { data, error } = await supabase.functions.invoke("get-pro-pricing", {
    body: {},
    timeout: 20_000,
  });

  if (error) {
    throw new Error(await extractErrorMessage(error));
  }

  return data as ProPricing;
}
