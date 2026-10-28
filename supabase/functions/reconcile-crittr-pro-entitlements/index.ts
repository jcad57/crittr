import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  ReconciliationBusyError,
  RevenueCatRestError,
  reconcileCrittrProForUser,
} from "../_shared/revenueCatEntitlement.ts";
/** Invoke from the deployment scheduler. Each bounded batch resumes via oldest verification time. */
Deno.serve(async (request: Request) => {
  const secret = Deno.env.get("ENTITLEMENT_RECONCILE_AUTH");
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  // Explicit targets are a service-only deployment/support operation. User JWTs
  // cannot invoke this worker, and normal client sync still derives its own UUID.
  const body = await request.json().catch(() => ({}));
  const userIds = body?.userIds;
  if (
    userIds !== undefined &&
    (!Array.isArray(userIds) ||
      userIds.length === 0 ||
      userIds.length > 20 ||
      userIds.some(
        (id: unknown) =>
          typeof id !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id,
          ),
      ))
  )
    return Response.json({ error: "invalid_user_ids" }, { status: 400 });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  let query = admin.from("profiles").select("id");
  query = userIds
    ? query.in("id", userIds)
    : query
        .eq("crittr_pro_active", true)
        .or(
          `subscription_environment.is.null,crittr_pro_last_synced_at.is.null,crittr_pro_last_synced_at.lt.${new Date(Date.now() - 3600000).toISOString()}`,
        );
  const { data, error } = await query
    .order("crittr_pro_last_synced_at", { ascending: true, nullsFirst: true })
    .limit(20);
  if (error)
    return new Response("Could not load reconciliation batch", { status: 503 });
  let failed = 0;
  const failuresByReason: Record<string, number> = {};
  // Bound concurrency so a slow provider cannot consume the entire edge invocation.
  const profiles = data ?? [];
  for (let offset = 0; offset < profiles.length; offset += 4) {
    await Promise.all(
      profiles.slice(offset, offset + 4).map(async (profile) => {
        try {
          await reconcileCrittrProForUser(admin, profile.id, { webhook: true });
        } catch (error) {
          failed++;
          const reason =
            error instanceof RevenueCatRestError
              ? `provider_${error.status}`
              : error instanceof ReconciliationBusyError
                ? "busy"
                : "verification_error";
          failuresByReason[reason] = (failuresByReason[reason] ?? 0) + 1;
          console.error("[billing-reconcile] verification failed", reason);
        }
      }),
    );
  }
  return Response.json(
    { processed: data?.length ?? 0, failed, failuresByReason },
    { status: failed ? 503 : 200 },
  );
});
