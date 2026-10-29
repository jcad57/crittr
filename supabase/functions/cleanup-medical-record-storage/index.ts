import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/** Scheduled service-only retry for individual, record, pet, and account deletions. */
Deno.serve(async (request: Request) => {
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("MEDICAL_RECORD_CLEANUP_AUTH");
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await admin
      .from("medical_record_storage_deletions")
      .select("id, storage_path")
      .lte("ready_at", new Date().toISOString())
      .order("ready_at")
      .limit(100);
    if (error) throw error;
    if (!data?.length) return Response.json({ removed: 0 });
    const { data: linked, error: lookupError } = await admin
      .from("pet_medical_record_files")
      .select("storage_path")
      .in(
        "storage_path",
        data.map((row) => row.storage_path),
      );
    if (lookupError) throw lookupError;
    const linkedPaths = new Set((linked ?? []).map((row) => row.storage_path));
    const paths = data
      .map((row) => row.storage_path)
      .filter((path) => !linkedPaths.has(path));
    if (paths.length) {
      const { error: removeError } = await admin.storage
        .from("medical-records")
        .remove(paths);
      if (removeError) throw removeError;
    }
    // Remove by queue ID so a stale worker cannot acknowledge a different event.
    const { error: acknowledgeError } = await admin
      .from("medical_record_storage_deletions")
      .delete()
      .in(
        "id",
        data.map((row) => row.id),
      );
    if (acknowledgeError) throw acknowledgeError;
    return Response.json({ removed: paths.length });
  } catch (error) {
    console.error("[cleanup-medical-record-storage]", error);
    return Response.json({ error: "cleanup_failed" }, { status: 503 });
  }
});
