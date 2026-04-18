import { isCrittrProFromProfile } from "@/lib/crittrPro";
import { syncCrittrProAfterCheckout } from "@/lib/crittrProEntitlementSync";
import { supabase } from "@/lib/supabase";

export type ProBillingParam = "monthly" | "annual";

export type SubscriptionPaymentSheetResponse = {
  customerId: string;
  subscriptionId: string;
  ephemeralKey: string;
  setupIntentClientSecret: string | null;
  paymentIntentClientSecret: string | null;
  billing: string;
  /** First invoice amount still due (e.g. 0 with a 100% promo); from Stripe `latest_invoice.amount_due`. */
  amountDueCents?: number | null;
  currency?: string | null;
  /** Pending cancel was cleared server-side; no PaymentSheet — go straight to activation. */
  resumed?: boolean;
  /** Re-subscribe flow: show payment on file before confirming resume. */
  resumePaymentReview?: boolean;
  paymentMethodLabel?: string | null;
  /** Client passes to finalize resume after collecting a new card. */
  setupIntentId?: string | null;
  /** Server returned only a SetupIntent for “use different card” on resume. */
  resumeCardSetup?: boolean;
  /** False when user already had a Crittr Pro subscription in Stripe (no 7-day intro). */
  introTrialApplied?: boolean;
};

export type FetchSubscriptionPaymentSheetOptions = {
  confirmSubscriptionResume?: boolean;
  createResumeCardSetupIntent?: boolean;
  finalizeResumeSetupIntentId?: string;
};

/** Lightweight: whether this account qualifies for the 7-day intro trial (never had Crittr Pro in Stripe). */
export async function fetchIntroTrialEligibility(
  billing: ProBillingParam,
): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke(
    "create-subscription-payment-sheet",
    {
      body: { billing, previewIntroTrialOnly: true },
      timeout: 20_000,
    },
  );
  if (error) {
    return true;
  }
  if (
    data &&
    typeof data === "object" &&
    "eligibleForIntroTrial" in data &&
    typeof (data as { eligibleForIntroTrial?: unknown }).eligibleForIntroTrial ===
      "boolean"
  ) {
    return (data as { eligibleForIntroTrial: boolean }).eligibleForIntroTrial;
  }
  return true;
}

/**
 * Calls Supabase Edge Function to create a trialing subscription and return
 * PaymentSheet secrets. Uses `supabase.functions.invoke` which attaches the
 * current session automatically — no manual token refresh or raw fetch needed.
 */
export async function fetchSubscriptionPaymentSheetParams(
  billing: ProBillingParam,
  promotionCode?: string,
  /** YYYY-MM-DD (UTC) — future cancel-at-period-end access end; aligns new trial end in checkout. */
  billingAnchor?: string,
  resumeOptions?: FetchSubscriptionPaymentSheetOptions,
): Promise<SubscriptionPaymentSheetResponse> {
  const trimmed = promotionCode?.trim();
  const anchor =
    typeof billingAnchor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(billingAnchor.trim())
      ? billingAnchor.trim()
      : undefined;
  const body: Record<string, unknown> = {
    billing,
  };
  if (trimmed) body.promotionCode = trimmed;
  if (anchor) body.billingAnchor = anchor;
  if (resumeOptions?.confirmSubscriptionResume) {
    body.confirmSubscriptionResume = true;
  }
  if (resumeOptions?.createResumeCardSetupIntent) {
    body.createResumeCardSetupIntent = true;
  }
  const fin = resumeOptions?.finalizeResumeSetupIntentId?.trim();
  if (fin) body.finalizeResumeSetupIntentId = fin;

  const { data, error } = await supabase.functions.invoke(
    "create-subscription-payment-sheet",
    { body, timeout: 30_000 },
  );

  if (error) {
    const fromBody =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : null;
    const msg = fromBody ?? (await extractErrorMessage(error));
    throw new Error(msg);
  }

  return data as SubscriptionPaymentSheetResponse;
}

export type WaitForProActivationOptions = {
  /** From `fetchSubscriptionPaymentSheetParams` — lets Edge Function sync without waiting on webhooks. */
  subscriptionId?: string | null;
};

/**
 * After PaymentSheet completes, periodically asks the Edge Function to reconcile Stripe
 * (webhook fallback) and polls until `crittr_pro_until` reflects active Pro.
 */
export async function waitForProActivation(
  maxWaitMs = 28_000,
  options?: WaitForProActivationOptions,
): Promise<void> {
  const start = Date.now();
  const pollInterval = 500;
  let lastSync = 0;

  while (Date.now() - start < maxWaitMs) {
    if (await profileShowsActivePro()) {
      return;
    }
    const now = Date.now();
    if (now - lastSync >= 2_000) {
      lastSync = now;
      await syncCrittrProAfterCheckout(options?.subscriptionId);
    }
    await sleep(pollInterval);
  }

  await syncCrittrProAfterCheckout(options?.subscriptionId);
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
