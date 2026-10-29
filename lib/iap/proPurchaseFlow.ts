import type { ProPurchaseResult, ProBillingParam, OfferingFetchFailure } from "@/lib/iap/checkout";
import type { PurchasesPackage } from "react-native-purchases";
import type { StoreTrialOffer } from "@/lib/iap/trialEligibility";

export type PurchaseFlowPhase = "review" | "purchasing" | "activating" | "complete" | "pending" | "recovery";
export type PurchaseFlowSource = "purchase" | "restore" | "paywall";
export type PurchaseFlowSnapshot = {
  phase: PurchaseFlowPhase;
  activationStage: 1 | 2 | 3;
  message: string | null;
  storeConfirmed: boolean;
  purchaseUnresolved: boolean;
  nativeRequestPending: boolean;
  requiresPlanReview: boolean;
  source: PurchaseFlowSource;
  working: boolean;
};
export type ReviewedPlan = { billing: ProBillingParam; productId: string; amount: number; currency: string; trial: StoreTrialOffer | null };
type ExistingResult = { hasCrittrPro: boolean; customerInfo: ProPurchaseResult["customerInfo"] | null };
type Outcome = { ok: true; result: ProPurchaseResult } | { ok: false; error: unknown };
type Dependencies = {
  sessionKey: () => string;
  detect: () => Promise<ExistingResult>;
  offering: (billing: ProBillingParam) => Promise<{ ok: true; package: PurchasesPackage } | { ok: false; reason: OfferingFetchFailure }>;
  trial: (pkg: PurchasesPackage) => Promise<StoreTrialOffer | null>;
  purchase: (pkg: PurchasesPackage) => Promise<ProPurchaseResult>;
  outstandingPurchase?: () => Promise<ProPurchaseResult> | null;
  restore: () => Promise<ProPurchaseResult>;
  verify: (result: ProPurchaseResult | null, source: PurchaseFlowSource, signal: AbortSignal) => Promise<void>;
  hasVerifiedAccess: () => boolean;
  pricesChanged: () => void;
  pause: (ms: number) => Promise<void>;
  storeName: string;
  schedule?: (callback: () => void, ms: number) => () => void;
};
export const PURCHASE_CALLBACK_TIMEOUT_MS = 30_000;
export const STORE_RETURN_GRACE_MS = 2_500;
const STAGE_TIMEOUT_MS = 15_000;
const INITIAL: PurchaseFlowSnapshot = { phase: "review", activationStage: 1, message: null, storeConfirmed: false, purchaseUnresolved: false, nativeRequestPending: false, requiresPlanReview: false, source: "purchase", working: false };
const ACTIVATION_DELAY_MESSAGE = "Your purchase is saved, but confirming Pro is taking longer than expected. Check your connection and retry activation. This won’t charge you again.";
const UNKNOWN_RESULT_MESSAGE = "Close any open store sheet, then check access. If the store stays unresponsive, restart Crittr and check again.";
const isActionableBillingError = (error: unknown) => {
  const kind = (error as { kind?: string } | null)?.kind;
  return kind === "sandbox_restricted" || kind === "account_conflict";
};

export function offeringFailureMessage(reason: OfferingFetchFailure, store: string): string {
  switch (reason) {
    case "rc_not_configured": return "Subscriptions aren’t available in this build. Update Crittr or contact support.";
    case "no_current_offering": return "Crittr Pro isn’t available right now. Please try again in a moment.";
    case "package_missing": return "This plan isn’t available right now. Go back to choose another plan.";
    case "billing_unavailable": return `Purchases aren’t available on this device. Check your ${store} account and purchase settings.`;
    case "get_offerings_failed": return `We couldn’t reach ${store}. Check your connection and try again.`;
  }
}

/** Native transaction lifetime and screen lifetime are separate: leaving or timing out never cancels a charge. */
export function createProPurchaseFlow(deps: Dependencies) {
  let state = INITIAL;
  let busy = false;
  let disposed = false;
  let attached = true;
  let pendingOrder = false;
  let attempt = 0;
  let lastResult: ProPurchaseResult | null = null;
  let lastPlan: ReviewedPlan | null = null;
  let recovery: "purchase" | "restore" | "check" = "purchase";
  let abort: AbortController | null = null;
  let nativePromise: Promise<ProPurchaseResult> | null = null;
  let nativeCaptured: Promise<"settled"> | null = null;
  let nativeOutcome: Outcome | null = null;
  let waitingForNative: (() => void) | null = null;
  let cancelReturnGrace: (() => void) | null = null;
  const listeners = new Set<() => void>();
  const schedule = deps.schedule ?? ((callback, ms) => { const id = setTimeout(callback, ms); return () => clearTimeout(id); });
  const update = (patch: Partial<PurchaseFlowSnapshot>) => {
    if (disposed) return;
    state = { ...state, ...patch };
    listeners.forEach((notify) => notify());
  };
  const bounded = async <T>(promise: Promise<T>, signal: AbortSignal, message: string): Promise<T> => {
    let cancelTimer = () => {};
    let onAbort = () => {};
    try {
      return await Promise.race([promise, new Promise<T>((_resolve, reject) => {
        cancelTimer = schedule(() => reject(new Error(message)), STAGE_TIMEOUT_MS);
        onAbort = () => reject(new Error("Subscription check cancelled"));
        signal.addEventListener("abort", onAbort, { once: true });
        if (signal.aborted) onAbort();
      })]);
    } finally { cancelTimer(); signal.removeEventListener("abort", onAbort); }
  };
  const run = async (work: (live: () => boolean, signal: AbortSignal) => Promise<void>) => {
    if (disposed || busy || state.phase === "complete") return;
    attached = true;
    busy = true;
    const id = ++attempt;
    const session = deps.sessionKey();
    abort = new AbortController();
    const signal = abort.signal;
    const live = () => !disposed && attached && id === attempt && session === deps.sessionKey() && !signal.aborted;
    update({ working: true });
    try { await work(live, signal); }
    catch (error) {
      if (!live()) return;
      const raw = error as { kind?: string; userCancelled?: boolean; message?: unknown };
      const message = typeof raw?.message === "string" && raw.message.trim() ? raw.message : "We couldn’t reach the store. Check your connection and try again.";
      if (raw?.kind === "cancelled" || raw?.userCancelled) {
        pendingOrder = false;
        update({ phase: "review", purchaseUnresolved: false, message: null });
      } else if (raw?.kind === "pending") {
        recovery = "check";
        pendingOrder = true;
        update({ phase: "pending", purchaseUnresolved: false, message: "The store is still processing your payment. We’ll unlock Pro once it’s confirmed." });
      } else if (raw?.kind === "already_owned") {
        recovery = "check";
        update({ phase: "recovery", purchaseUnresolved: false, storeConfirmed: true, message: "Your store account already owns this plan. Check access or restore purchases to finish activating Pro." });
      } else if (raw?.kind === "sandbox_restricted" || raw?.kind === "account_conflict") {
        recovery = "check";
        update({ phase: "recovery", purchaseUnresolved: false, message });
      } else if (raw?.kind === "result_unknown") {
        recovery = "check";
        update({ phase: "recovery", purchaseUnresolved: true, message: UNKNOWN_RESULT_MESSAGE });
      } else {
        update({ phase: pendingOrder ? "pending" : "recovery", message: state.purchaseUnresolved ? UNKNOWN_RESULT_MESSAGE : state.storeConfirmed ? ACTIVATION_DELAY_MESSAGE : message });
      }
    } finally {
      if (id === attempt) {
        busy = false;
        if (live()) { update({ working: false }); drainNativeOutcome(); }
      }
    }
  };
  const activate = async (result: ProPurchaseResult | null, source: PurchaseFlowSource, live: () => boolean, signal: AbortSignal, verified = false) => {
    lastResult = result;
    pendingOrder = false;
    update({ phase: "activating", activationStage: 1, purchaseUnresolved: false, storeConfirmed: true, message: null, source });
    if (!verified) {
      try { await bounded(deps.verify(result, source, signal), signal, ACTIVATION_DELAY_MESSAGE); }
      catch (error) { if (!live() || isActionableBillingError(error) || !deps.hasVerifiedAccess()) throw error; }
    }
    if (!live()) return;
    update({ activationStage: 2 });
    await deps.pause(340);
    if (!live()) return;
    update({ activationStage: 3 });
    await deps.pause(320);
    if (live()) update({ phase: "complete" });
  };
  const asResult = (existing: ExistingResult): ProPurchaseResult | null => existing.customerInfo
    ? { customerInfo: existing.customerInfo, hasCrittrPro: existing.hasCrittrPro, productIdentifier: "" } : null;
  const consumeNativeOutcome = async (live: () => boolean, signal: AbortSignal) => {
    const outcome = nativeOutcome;
    nativeOutcome = null;
    nativePromise = null;
    nativeCaptured = null;
    update({ purchaseUnresolved: false, nativeRequestPending: false });
    if (!outcome) return;
    if (!outcome.ok) { recovery = "purchase"; throw outcome.error; }
    if (live()) await activate(outcome.result, "purchase", live, signal);
  };
  const drainNativeOutcome = () => {
    if (nativeOutcome && attached && !disposed && !busy && state.phase !== "complete") void run(consumeNativeOutcome);
  };
  const awaitNative = async (promise: Promise<ProPurchaseResult>, live: () => boolean, signal: AbortSignal, resumed = false) => {
    if (nativePromise !== promise || !nativeCaptured) {
      nativePromise = promise;
      const session = deps.sessionKey();
      nativeCaptured = promise.then<Outcome, Outcome>(
        (result) => ({ ok: true, result }), (error) => ({ ok: false, error }),
      ).then((outcome) => {
        if (!disposed && session === deps.sessionKey()) {
          nativeOutcome = outcome;
          update({ nativeRequestPending: false });
          drainNativeOutcome();
        }
        return "settled" as const;
      });
    }
    update({ nativeRequestPending: !nativeOutcome });
    const captured = nativeCaptured;
    let cancelTimer = () => {};
    let onAbort = () => {};
    let wake: (() => void) | null = null;
    try {
      const winner = resumed ? "unknown" : await Promise.race([captured, new Promise<"unknown" | "aborted">((resolve) => {
        wake = () => resolve("unknown");
        waitingForNative = wake;
        cancelTimer = schedule(wake, PURCHASE_CALLBACK_TIMEOUT_MS);
        onAbort = () => resolve("aborted");
        signal.addEventListener("abort", onAbort, { once: true });
        if (signal.aborted) onAbort();
      })]);
      if (!live() || winner === "aborted") return;
      if (winner === "settled" || nativeOutcome) await consumeNativeOutcome(live, signal);
      else {
        recovery = "check";
        update({ phase: "recovery", purchaseUnresolved: true, message: UNKNOWN_RESULT_MESSAGE });
      }
    } finally {
      cancelTimer();
      signal.removeEventListener("abort", onAbort);
      if (waitingForNative === wake) {
        cancelReturnGrace?.(); cancelReturnGrace = null;
        waitingForNative = null;
      }
    }
  };
  const resumeOutstanding = () => {
    const outstanding = nativePromise ?? deps.outstandingPurchase?.();
    if (!outstanding || busy || state.phase === "complete") return Promise.resolve();
    return run((live, signal) => awaitNative(outstanding, live, signal, true));
  };
  const purchase = (plan: ReviewedPlan) => {
    if (disposed || busy || state.phase === "complete") return Promise.resolve();
    if (state.purchaseUnresolved || state.storeConfirmed || pendingOrder) return check();
    if (nativePromise || deps.outstandingPurchase?.()) return resumeOutstanding();
    lastPlan = plan;
    recovery = "purchase";
    return run(async (live, signal) => {
      update({ phase: "purchasing", message: null, source: "purchase", requiresPlanReview: false });
      if (deps.hasVerifiedAccess()) { await activate(null, "paywall", live, signal); return; }
      const existing = await bounded(deps.detect(), signal, "We couldn’t check your subscription. Check your connection and try again.");
      if (!live()) return;
      if (existing.hasCrittrPro) { await activate(asResult(existing), "paywall", live, signal); return; }
      const offering = await bounded(deps.offering(plan.billing), signal, "Loading the store plan took too long. Please try again.");
      if (!live()) return;
      if (!offering.ok) throw new Error(offeringFailureMessage(offering.reason, deps.storeName));
      const product = offering.package.product;
      if (product.identifier !== plan.productId || Math.round(product.price * 100) !== plan.amount || product.currencyCode.toLowerCase() !== plan.currency.toLowerCase()) {
        update({ requiresPlanReview: true });
        deps.pricesChanged();
        throw new Error("The store updated this plan’s price. Go back to review the current price before subscribing.");
      }
      const trial = await bounded(deps.trial(offering.package), signal, "We couldn’t confirm this plan’s trial terms. Please review the plan and try again.");
      if (!live()) return;
      if (trial?.durationLabel !== plan.trial?.durationLabel || trial?.iso8601 !== plan.trial?.iso8601) {
        update({ requiresPlanReview: true });
        deps.pricesChanged();
        throw new Error("Your trial offer changed. Go back to review the current terms before subscribing.");
      }
      await awaitNative(deps.purchase(offering.package), live, signal);
    });
  };
  const restore = () => {
    if (disposed || busy || state.phase === "complete") return Promise.resolve();
    if (nativePromise || deps.outstandingPurchase?.()) return state.purchaseUnresolved ? check() : resumeOutstanding();
    recovery = "restore";
    return run(async (live, signal) => {
      update({ phase: "purchasing", message: null, source: "restore" });
      const result = await bounded(deps.restore(), signal, "Restoring took longer than expected. Check your connection and try again.");
      if (!live()) return;
      if (!result.hasCrittrPro) throw new Error(`We couldn’t find an active Crittr Pro subscription. Make sure you’re using the ${deps.storeName} account that made the purchase. If your subscription expired, choose Review plans to subscribe again. Restoring an expired subscription won’t renew it.`);
      await activate(result, "restore", live, signal);
    });
  };
  const check = () => {
    if (disposed || busy || state.phase === "complete") return Promise.resolve();
    recovery = "check";
    const wasPending = pendingOrder;
    return run(async (live, signal) => {
      // A missing native callback can also hold the SDK identity queue. Verify
      // with our server directly; do not enqueue another purchase or restore.
      if (state.purchaseUnresolved) {
        try { await bounded(deps.verify(lastResult, "purchase", signal), signal, UNKNOWN_RESULT_MESSAGE); }
        catch (error) { if (!live() || isActionableBillingError(error) || !deps.hasVerifiedAccess()) throw error; }
        if (live()) await activate(lastResult, "purchase", live, signal, true);
        return;
      }
      if (wasPending) {
        update({ message: "Checking your payment with the store…" });
        try { await bounded(deps.verify(lastResult, "purchase", signal), signal, "Payment confirmation is taking longer than expected."); }
        catch (error) {
          if (!live()) return;
          if (isActionableBillingError(error)) throw error;
          if (!deps.hasVerifiedAccess()) {
            update({ phase: "pending", message: "We haven’t received payment confirmation yet. Check your connection and check again shortly. Checking won’t start another purchase." });
            return;
          }
        }
        if (live()) await activate(lastResult, "purchase", live, signal, true);
        return;
      }
      update({ phase: state.storeConfirmed ? "activating" : "purchasing", message: null, source: state.storeConfirmed ? state.source : "paywall" });
      const source = state.storeConfirmed ? state.source : "paywall";
      try { await bounded(deps.verify(lastResult, source, signal), signal, "Checking access took too long. Please try again."); }
      catch (error) {
        if (!live()) return;
        if (isActionableBillingError(error)) throw error;
        if (!deps.hasVerifiedAccess()) {
          if (!state.storeConfirmed) throw new Error("We couldn’t verify an active subscription. Check your connection or restore purchases with the store account used to subscribe.");
          throw error;
        }
      }
      if (live()) await activate(lastResult, source, live, signal, true);
    });
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    purchase, restore, check, resumeOutstanding,
    onAppActive: () => {
      if (waitingForNative) {
        cancelReturnGrace?.();
        cancelReturnGrace = schedule(() => waitingForNative?.(), STORE_RETURN_GRACE_MS);
      } else if (!busy && (pendingOrder || state.purchaseUnresolved)) void check();
    },
    retry: () => state.purchaseUnresolved || state.storeConfirmed || state.phase === "pending" || recovery === "check" ? check() : recovery === "restore" ? restore() : lastPlan ? purchase(lastPlan) : check(),
    showRecovery: () => { if (!busy) { recovery = "restore"; update({ phase: "recovery", message: null }); } },
    cancel: () => { attached = false; ++attempt; abort?.abort(); cancelReturnGrace?.(); busy = false; update({ working: false }); },
    dispose: () => { attached = false; disposed = true; ++attempt; abort?.abort(); cancelReturnGrace?.(); listeners.clear(); },
  };
}
