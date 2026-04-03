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
 * PaymentSheet secrets (Stripe React Native PaymentSheet).
 */
export async function fetchSubscriptionPaymentSheetParams(
  billing: ProBillingParam,
): Promise<SubscriptionPaymentSheetResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("You need to be signed in to subscribe.");
  }

  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!base) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL.");
  }

  const res = await fetch(
    `${base}/functions/v1/create-subscription-payment-sheet`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ billing }),
    },
  );

  const json = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const message =
      typeof json.message === "string"
        ? json.message
        : typeof json.error === "string"
          ? json.error
          : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return json as unknown as SubscriptionPaymentSheetResponse;
}
