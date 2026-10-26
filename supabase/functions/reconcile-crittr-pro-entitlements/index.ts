import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { reconcileCrittrProForUser } from "../_shared/revenueCatEntitlement.ts";
/** Invoke from the deployment scheduler. Each bounded batch resumes via oldest verification time. */
Deno.serve(async (request: Request) => {
  const secret = Deno.env.get("ENTITLEMENT_RECONCILE_AUTH");
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("crittr_pro_active", true)
    .or(
      `crittr_pro_last_synced_at.is.null,crittr_pro_last_synced_at.lt.${new Date(Date.now() - 3600000).toISOString()}`,
    )
    .order("crittr_pro_last_synced_at", { ascending: true, nullsFirst: true })
    .limit(20);
  if (error)
    return new Response("Could not load reconciliation batch", { status: 503 });
  let failed = 0;
  // Bound concurrency so a slow provider cannot consume the entire edge invocation.
  const profiles = data ?? [];
  for (let offset = 0; offset < profiles.length; offset += 4) {
    await Promise.all(
      profiles.slice(offset, offset + 4).map(async (profile) => {
        try {
          await reconcileCrittrProForUser(admin, profile.id, { webhook: true });
        } catch {
          failed++;
        }
      }),
    );
  }
  return Response.json(
    { processed: data?.length ?? 0, failed },
    { status: failed ? 503 : 200 },
  );
});
