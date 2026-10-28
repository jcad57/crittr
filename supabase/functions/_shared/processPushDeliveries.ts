import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { ExpoRequestError, requestExpo, retryableExpoResult, type ExpoResult } from "./expoPushDelivery.ts";

type Job = {
  id: string; expo_push_token: string; expo_ticket_id: string | null; attempts: number;
  title: string; body: string; data: Record<string, unknown>; expired: boolean; deliverable: boolean;
};

export async function processPushDeliveries(admin: SupabaseClient, activityId?: string, expoAccessToken?: string, invitationsOnly = false) {
  const { data, error } = invitationsOnly
    ? await admin.rpc("claim_co_care_invite_push_deliveries")
    : await admin.rpc("claim_notification_push_deliveries", { p_activity_id: activityId ?? null });
  if (error) throw error;
  const jobs = (data ?? []) as Job[];
  const counts = { accepted: 0, delivered: 0, retrying: 0, failed: 0, skipped: 0 };
  const update = async (job: Job, patch: Record<string, unknown>) => {
    const { error } = await admin.from("notification_push_deliveries").update({ locked_until: null, ...patch }).eq("id", job.id);
    if (error) throw error;
  };
  const complete = async (job: Job, error: string | null) => {
    await update(job, { completed_at: new Date().toISOString(), last_error: error });
  };
  const retry = async (job: Job, error: string, delay = Math.min(300, 2 ** Math.min(job.attempts, 8))) => {
    await update(job, { next_attempt_at: new Date(Date.now() + delay * 1000).toISOString(), last_error: error });
    counts.retrying++;
  };
  const reject = async (job: Job, result: ExpoResult) => {
    const reason = result.details?.error ?? result.message ?? "Unknown Expo delivery error";
    if (reason === "DeviceNotRegistered") {
      const { error } = await admin.from("user_expo_push_devices").delete().eq("expo_push_token", job.expo_push_token);
      if (error) throw error;
      const { error: legacyError } = await admin.from("user_expo_push_tokens").delete().eq("expo_push_token", job.expo_push_token);
      if (legacyError) throw legacyError;
    }
    if (retryableExpoResult(result)) {
      // An explicit receipt failure requires a new send attempt, not another receipt lookup.
      await update(job, { expo_ticket_id: null });
      await retry(job, reason);
    } else { await complete(job, reason); counts.failed++; }
  };
  const eligible: Job[] = [];
  for (const job of jobs) {
    if (job.expired || !job.deliverable) {
      await complete(job, job.expired ? "Notification expired" : "Device or preference no longer eligible");
      counts.skipped++;
    } else eligible.push(job);
  }
  const awaitingReceipt = eligible.filter((job) => job.expo_ticket_id);
  const sending = eligible.filter((job) => !job.expo_ticket_id);
  if (sending.length) {
    let tickets: ExpoResult[];
    try {
      const result = await requestExpo("send", sending.map((job) => ({
        to: job.expo_push_token, title: job.title, body: job.body, data: job.data,
        sound: "default", channelId: "default", priority: "high",
        ttl: typeof job.data.expires_at === "string"
          ? Math.max(1, Math.min(3600, Math.floor((Date.parse(job.data.expires_at) - Date.now()) / 1000))) : 3600,
      })), expoAccessToken);
      if (!Array.isArray(result) || result.length !== sending.length || result.some((t) => !t || !["ok", "error"].includes(t.status))) {
        throw new ExpoRequestError("Incomplete Expo ticket response", true);
      }
      tickets = result;
    } catch (error) {
      for (const job of sending) {
        if (error instanceof ExpoRequestError && !error.retryable) {
          await complete(job, error.message); counts.failed++;
        } else await retry(job, error instanceof Error ? error.message : "Push request failed");
      }
      tickets = [];
    }
    for (let i = 0; i < tickets.length; i++) {
      const job = sending[i], ticket = tickets[i];
      if (ticket.status === "ok" && ticket.id) {
        await update(job, { expo_ticket_id: ticket.id, next_attempt_at: new Date(Date.now() + 15 * 60_000).toISOString(), last_error: null });
        counts.accepted++;
      } else await reject(job, ticket);
    }
  }
  if (awaitingReceipt.length) {
    let receipts: Record<string, ExpoResult>;
    try {
      const result = await requestExpo("getReceipts", { ids: awaitingReceipt.map((job) => job.expo_ticket_id) }, expoAccessToken);
      if (typeof result !== "object" || result === null || Array.isArray(result)) throw new Error("Invalid receipts");
      receipts = result as Record<string, ExpoResult>;
    } catch {
      for (const job of awaitingReceipt) await retry(job, "Receipt lookup unavailable", 900);
      return counts;
    }
    for (const job of awaitingReceipt) {
      const receipt = receipts[job.expo_ticket_id!];
      if (!receipt) { await retry(job, "Waiting for Expo receipt", 900); continue; }
      if (receipt.status === "ok") { await complete(job, null); counts.delivered++; }
      else await reject(job, receipt);
    }
  }
  return counts;
}
