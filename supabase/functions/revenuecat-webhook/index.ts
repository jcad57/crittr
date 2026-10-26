import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { reconcileCrittrProForUser } from "../_shared/revenueCatEntitlement.ts";
import {
  affectedAccountIds,
  type RevenueCatEvent,
} from "../_shared/revenueCatWebhook.ts";
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const expected = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  if (!expected) return json({ error: "server_misconfigured" }, 500);
  if (
    (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "") !==
    expected
  )
    return json({ error: "unauthorized" }, 401);
  let event: RevenueCatEvent;
  try {
    event = (await req.json()).event;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (
    typeof event?.id !== "string" ||
    event.id.length > 256 ||
    typeof event.type !== "string"
  )
    return json({ error: "invalid_event" }, 400);
  if (event.type === "TEST") return json({ ok: true });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  try {
    const { data: claimed, error } = await admin.rpc("claim_billing_webhook", {
      event_id: event.id,
      kind: event.type,
    });
    if (error) throw error;
    if (!claimed) {
      const { data, error: readError } = await admin
        .from("billing_webhook_events")
        .select("completed_at")
        .eq("id", event.id)
        .single();
      if (readError) throw readError;
      return data.completed_at
        ? json({ ok: true, duplicate: true })
        : json({ error: "processing" }, 503);
    }
    for (const userId of affectedAccountIds(event)) {
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      if (profileError) throw profileError;
      if (profile)
        await reconcileCrittrProForUser(admin, userId, { webhook: true });
    }
    const { error: completeError } = await admin
      .from("billing_webhook_events")
      .update({ completed_at: new Date().toISOString(), lease_until: null })
      .eq("id", event.id);
    if (completeError) throw completeError;
    return json({ ok: true });
  } catch {
    await admin
      .from("billing_webhook_events")
      .update({ lease_until: null })
      .eq("id", event.id)
      .is("completed_at", null);
    console.error("[billing-webhook] reconciliation failed", event.type);
    return json({ error: "reconcile_failed" }, 503);
  }
});
