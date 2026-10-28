import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { processPushDeliveries } from "../_shared/processPushDeliveries.ts";
import { materializeCareReminders } from "../_shared/materializeCareReminders.ts";

// Run every minute from Supabase Cron. Activity completions need this worker
// even when the originating app closes before its immediate wake-up request.
// The secret is service-only, never EXPO_PUBLIC.
Deno.serve(async (request: Request) => {
  const secret = Deno.env.get("PUSH_DISPATCH_AUTH");
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let reminders;
    try { reminders = await materializeCareReminders(admin); }
    catch (error) {
      console.error("[care-reminders] materialization deferred", error instanceof Error ? error.message : "Unknown error");
      reminders = { failed: 1 };
    }
    const result = await processPushDeliveries(admin, undefined, Deno.env.get("EXPO_ACCESS_TOKEN"));
    return Response.json({ ...result, reminders }, { status: reminders.failed ? 503 : 200 });
  } catch (error) {
    console.error("[push-dispatch] worker failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Push dispatcher failed; queued work will retry" }, { status: 503 });
  }
});
