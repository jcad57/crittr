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

  const { data: blob, error: dlErr } = await supabaseUser.storage
    .from(MEDICAL_RECORDS_BUCKET)
    .download(row.storage_path);

  if (dlErr || !blob) {
    console.error("[serve-medical-record-file] storage download", dlErr);
    return json(
      {
        error: "download_failed",
        message: dlErr?.message ?? "Could not read file.",
      },
      500,
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

  return new Response(blob, {
    headers: {
      ...corsHeaders,
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${asciiName}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
});
