/**
 * Streams a medical-record upload to authorized clients without exposing a direct
 * Storage signed URL (download hits this Function URL instead).
 *
 * Auth: user's JWT must pass RLS on `pet_medical_record_files` + Storage policies.
 *
 * Deploy:
 *   supabase functions deploy serve-medical-record-file
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MEDICAL_RECORDS_BUCKET = "medical-records";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return json(
      {
        error: "missing_authorization",
        message: "Sign in required.",
      },
      401,
    );
  }

  const url = new URL(req.url);
  const fileId = url.searchParams.get("file_id")?.trim() ?? "";
  if (!fileId || !UUID_RE.test(fileId)) {
    return json({ error: "invalid_file_id" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser(jwt);
  if (authError || !user)
    return json(
      { error: "unauthorized", message: "Sign in again to view this file." },
      401,
    );

  const { data: row, error: rowErr } = await supabaseUser
    .from("pet_medical_record_files")
    .select("id, storage_path, mime_type, original_filename")
    .eq("id", fileId)
    .maybeSingle();

  if (rowErr) {
    console.error("[serve-medical-record-file] select", rowErr);
    return json(
      {
        error: "lookup_failed",
        message: rowErr.message,
      },
      500,
    );
  }
  if (!row) {
    return json(
      {
        error: "not_found",
        message: "File not found or access denied.",
      },
      404,
    );
  }

  let download: Response;
  try {
    // Forward the user's JWT to Storage so both row and object policies apply.
    // Stream the body instead of buffering the entire document into a Blob.
    const path = row.storage_path.split("/").map(encodeURIComponent).join("/");
    download = await fetch(
      `${supabaseUrl}/storage/v1/object/authenticated/${MEDICAL_RECORDS_BUCKET}/${path}`,
      {
        headers: { Authorization: `Bearer ${jwt}`, apikey: anonKey },
        signal: AbortSignal.timeout(150_000),
      },
    );
  } catch (error) {
    console.error("[serve-medical-record-file] storage download", error);
    return json(
      { error: "download_failed", message: "Could not read file. Try again." },
      503,
    );
  }
  if (!download.ok || !download.body) {
    await download.body?.cancel();
    return json(
      {
        error: "download_failed",
        message: "File not found or access denied.",
      },
      download.status === 401 ? 401 : 404,
    );
  }

  const mime =
    typeof row.mime_type === "string" && row.mime_type.trim().length > 0
      ? row.mime_type.trim()
      : "application/octet-stream";

  const asciiName = (
    typeof row.original_filename === "string" && row.original_filename.trim()
      ? row.original_filename.trim()
      : "document"
  )
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/"/g, "");

  return new Response(download.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${asciiName}"`,
      "Cache-Control": "private, max-age=0, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
