/**
 * parse-medical-record
 *
 * Uses Claude's vision + PDF support to read an uploaded medical record (image or PDF) and
 * extract structured medication and vaccination data. The function *does not* write to
 * `pet_medications` or `pet_vaccinations` — it returns a candidate list, and the client shows
 * a review sheet where the user confirms before the existing client-side mutations persist
 * anything. This keeps RLS and permission enforcement on the same paths the manual forms use.
 *
 * Secrets (Supabase Dashboard → Project Settings → Edge Functions → Secrets):
 *   ANTHROPIC_API_KEY — required (shared with `crittr-ai-chat`)
 *   CRITTR_OCR_MODEL  — optional; default Haiku 4.5 (vision-capable, cheap). Override with a
 *                       stronger Sonnet for noisy / handwritten vet paperwork.
 *
 * Memory / compute (Supabase Edge):
 *   Images are sent to Claude via **signed Storage URLs** so this function never materializes
 *   multi‑megabyte base64 strings (the previous approach tripped "not enough compute resources").
 *   PDFs and HEIC still use base64 from a single file per request. If you ever need heavier
 *   OCR (huge PDFs, batch farm), run the same Anthropic calls from Cloud Run / Fly.io / AWS
 *   Lambda (512MB–3GB) or use a dedicated OCR API (Textract, Document AI) + text-only LLM.
 *
 * Deploy:
 *   supabase functions deploy parse-medical-record
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encodeBase64 } from "jsr:@std/encoding@1.0.5/base64";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const MEDICAL_RECORDS_BUCKET = "medical-records";

/** Anthropic accepts up to ~32MB per document. We cap per-file at 10MB to keep round-trips
 *  fast and stay well under edge-function memory limits. Larger files are skipped with a
 *  warning returned to the client. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Upper bound for one `/functions/v1/parse-medical-record` call. Files are processed in
 *  memory-bounded batches below, so this can be comfortably higher than what a single
 *  Anthropic call handles. Anything beyond is truncated with a warning. */
const MAX_FILES_PER_CALL = 12;
/** Max **image** files per Claude call when using URL sources (no base64 in this runtime).
 *  PDF/HEIC still go one file per call. */
const IMAGE_URL_BATCH_SIZE = 3;
/** How many Anthropic calls we fan out concurrently. Kept at 1 (sequential) because each
 *  in-flight request keeps its base64 blobs + serialized JSON body pinned in memory until
 *  the socket is flushed; running two at once reliably tripped the "not enough compute
 *  resources" limit on the Supabase edge runtime when users uploaded 5+ pages at once.
 *  Throughput for 10 images is still ~40-50s wall-clock, well under the 150s client
 *  timeout in `lib/supabase.ts#fetchWithTimeout`. */
const MAX_CONCURRENT_BATCHES = 1;
const MAX_OUTPUT_TOKENS = 4_096;

type FileRow = {
  id: string;
  storage_path: string;
  mime_type: string | null;
  original_filename: string | null;
  file_size_bytes: number | null;
};

type ExistingMed = {
  id: string;
  name: string;
  dosage: string | null;
  condition: string | null;
};

type ExistingVac = {
  id: string;
  name: string;
  administered_on: string | null;
  expires_on: string | null;
};

type ExtractedMedication = {
  name: string;
  dosage: string | null;
  frequency: string | null;
  condition: string | null;
  notes: string | null;
  doses_per_period: number | null;
  dose_period: "day" | "week" | "month" | null;
  interval_count: number | null;
  interval_unit: "day" | "week" | "month" | null;
  last_given_on: string | null;
  next_due_date: string | null;
  confidence: "low" | "medium" | "high";
  duplicate_of_id: string | null;
};

type ExtractedVaccination = {
  name: string;
  administered_on: string | null;
  expires_on: string | null;
  frequency_label: string | null;
  administered_by: string | null;
  lot_number: string | null;
  notes: string | null;
  confidence: "low" | "medium" | "high";
  duplicate_of_id: string | null;
};

type ExtractionResult = {
  pet_name_detected: string | null;
  medications: ExtractedMedication[];
  vaccinations: ExtractedVaccination[];
};

function json(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(vaccine|vaccination|booster|shot|tablet|tablets|capsule|capsules|oral|chewable|injection)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Curated alias map — when two candidates normalize to the same canonical token we treat
 * them as the same entity for duplicate detection. Intentionally small; falls back to
 * normalized-equality otherwise.
 */
const NAME_ALIASES: Record<string, string> = {
  dhpp: "distemper combo",
  "da2pp": "distemper combo",
  dapp: "distemper combo",
  dhppl: "distemper combo",
  dhppil: "distemper combo",
  rv: "rabies",
  rabies1yr: "rabies",
  rabies3yr: "rabies",
  "1year rabies": "rabies",
  "3year rabies": "rabies",
  bordetella: "bordetella",
  kennelcough: "bordetella",
  oclacitinib: "apoquel",
  apoquel: "apoquel",
  nexgard: "nexgard",
  "nexgard spectra": "nexgard",
  heartgard: "heartgard",
  sentinel: "sentinel",
  simparica: "simparica",
  "simparica trio": "simparica",
  bravecto: "bravecto",
};

function canonicalKey(name: string): string {
  const norm = normalizeName(name);
  if (!norm) return "";
  const compact = norm.replace(/\s+/g, "");
  return NAME_ALIASES[compact] ?? NAME_ALIASES[norm] ?? norm;
}

function findDuplicateId<T extends { id: string; name: string }>(
  candidate: string,
  existing: T[],
): string | null {
  const key = canonicalKey(candidate);
  if (!key) return null;
  for (const row of existing) {
    if (canonicalKey(row.name) === key) return row.id;
  }
  return null;
}

const EXTRACTION_TOOL = {
  name: "record_extracted_medical_data",
  description:
    "Return the medications and vaccinations found in the supplied pet medical document(s). Use only information visible in the documents; do not guess.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      pet_name_detected: {
        type: ["string", "null"],
        description:
          "Pet's name if it appears on the document, otherwise null.",
      },
      medications: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: {
              type: "string",
              description: "Medication name as written (brand or generic).",
            },
            dosage: {
              type: ["string", "null"],
              description:
                "Human-readable dose (e.g. '5 mg', '1 tablet', '0.5 ml'). Null if not on doc.",
            },
            frequency: {
              type: ["string", "null"],
              description:
                "Schedule in the vet's own words (e.g. 'twice daily', 'every 30 days').",
            },
            condition: {
              type: ["string", "null"],
              description: "Indication / condition being treated.",
            },
            notes: {
              type: ["string", "null"],
              description:
                "Any vet instructions or clinically-relevant notes tied to this medication.",
            },
            doses_per_period: {
              type: ["integer", "null"],
              description:
                "If the schedule maps cleanly to 'N times per day/week/month', provide N. Else null.",
            },
            dose_period: {
              type: ["string", "null"],
              enum: ["day", "week", "month", null],
            },
            interval_count: {
              type: ["integer", "null"],
              description:
                "For custom intervals like 'every 3 months', N. Else null.",
            },
            interval_unit: {
              type: ["string", "null"],
              enum: ["day", "week", "month", null],
            },
            last_given_on: {
              type: ["string", "null"],
              description: "ISO date YYYY-MM-DD, or null.",
            },
            next_due_date: {
              type: ["string", "null"],
              description: "ISO date YYYY-MM-DD, or null.",
            },
            confidence: {
              type: "string",
              enum: ["low", "medium", "high"],
            },
          },
          required: ["name", "confidence"],
        },
      },
      vaccinations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: {
              type: "string",
              description:
                "Vaccine name as written (e.g. 'Rabies', 'DHPP', 'Bordetella').",
            },
            administered_on: {
              type: ["string", "null"],
              description: "ISO date YYYY-MM-DD when dose was given.",
            },
            expires_on: {
              type: ["string", "null"],
              description:
                "ISO date YYYY-MM-DD for vaccine expiry or when the next dose is due (Crittr uses this for due-soon reminders).",
            },
            frequency_label: {
              type: ["string", "null"],
              description:
                "Vet-stated cadence (e.g. 'Annual', '3-year rabies').",
            },
            administered_by: {
              type: ["string", "null"],
              description: "Clinic or veterinarian name.",
            },
            lot_number: {
              type: ["string", "null"],
              description: "Vaccine lot / serial number as printed.",
            },
            notes: {
              type: ["string", "null"],
              description: "Any vet note attached to this vaccination.",
            },
            confidence: {
              type: "string",
              enum: ["low", "medium", "high"],
            },
          },
          required: ["name", "confidence"],
        },
      },
    },
    required: ["pet_name_detected", "medications", "vaccinations"],
  },
};

function buildSystemPrompt(
  petName: string,
  existingMeds: ExistingMed[],
  existingVacs: ExistingVac[],
): string {
  const medLines = existingMeds
    .slice(0, 40)
    .map(
      (m) =>
        `- ${m.name}${m.dosage ? ` · ${m.dosage}` : ""}${m.condition ? ` · ${m.condition}` : ""}`,
    )
    .join("\n");
  const vacLines = existingVacs
    .slice(0, 40)
    .map(
      (v) =>
        `- ${v.name}${v.administered_on ? ` · given ${v.administered_on}` : ""}${
          v.expires_on ? ` · expires ${v.expires_on}` : ""
        }`,
    )
    .join("\n");

  return `You are a veterinary records extractor. You will receive one or more medical documents for the pet named "${petName || "(unknown)"}".

Extract any medications and vaccinations that appear on the documents. Return them via the \`record_extracted_medical_data\` tool.

Rules:
- Only include items you can actually see in the supplied documents.
- Never invent dosages, dates, or frequencies. If a field is not on the document, set it to null.
- Dates must be ISO YYYY-MM-DD. Convert "Jun 3, 2025" → "2025-06-03". If a date is ambiguous (e.g. "3/4/24"), prefer US format (MM/DD/YY) unless the document context clearly indicates otherwise.
- Assign \`confidence\`: high = clearly printed and unambiguous; medium = partially obscured or mildly ambiguous; low = handwritten / faded / uncertain.
- Do not duplicate entries within your response — if the same medication appears multiple times on the document (e.g. refill history), return one entry and summarize refill dates in \`notes\`.
- If the document is unrelated to medications or vaccinations (e.g. invoice, lab report), return empty arrays.

The pet already has the following records in Crittr (for your awareness — do NOT filter these out; the server will mark likely duplicates separately):

Existing medications:
${medLines || "(none)"}

Existing vaccinations:
${vacLines || "(none)"}`;
}

/** Anthropic fetches raster images from this URL — avoids multi‑MB base64 in the Edge runtime. */
const SIGNED_URL_EXPIRY_SEC = 15 * 60;

type ClaudeFilePrepared =
  | { tag: "image_url"; url: string; filename: string }
  | { tag: "image_base64"; mediaType: string; data: string; filename: string }
  | { tag: "pdf_base64"; data: string; filename: string }
  | { tag: "skipped"; reason: string; filename: string };

async function prepareClaudeFileInput(
  admin: ReturnType<typeof createClient>,
  file: FileRow,
): Promise<ClaudeFilePrepared> {
  const filename = file.original_filename ?? "file";
  const mime = (file.mime_type ?? "").toLowerCase();

  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf";
  if (!isImage && !isPdf) {
    return {
      tag: "skipped",
      reason: `Unsupported file type${mime ? `: ${mime}` : ""}`,
      filename,
    };
  }

  if (file.file_size_bytes != null && file.file_size_bytes > MAX_FILE_BYTES) {
    return {
      tag: "skipped",
      reason: `File too large to scan (max ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))}MB)`,
      filename,
    };
  }

  if (isPdf) {
    const { data, error } = await admin.storage
      .from(MEDICAL_RECORDS_BUCKET)
      .download(file.storage_path);
    if (error || !data) {
      return {
        tag: "skipped",
        reason: "Could not read the file from storage",
        filename,
      };
    }
    const buf = await data.arrayBuffer();
    if (buf.byteLength > MAX_FILE_BYTES) {
      return {
        tag: "skipped",
        reason: `File too large to scan (max ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))}MB)`,
        filename,
      };
    }
    return {
      tag: "pdf_base64",
      data: encodeBase64(new Uint8Array(buf)),
      filename,
    };
  }

  /** HEIC/HEIF: signed URLs are unreliable for Claude vision; keep a single base64 payload. */
  if (mime === "image/heic" || mime === "image/heif") {
    const { data, error } = await admin.storage
      .from(MEDICAL_RECORDS_BUCKET)
      .download(file.storage_path);
    if (error || !data) {
      return {
        tag: "skipped",
        reason: "Could not read the file from storage",
        filename,
      };
    }
    const buf = await data.arrayBuffer();
    if (buf.byteLength > MAX_FILE_BYTES) {
      return {
        tag: "skipped",
        reason: `File too large to scan (max ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))}MB)`,
        filename,
      };
    }
    /** Same labeling approach as before — vision models often still decode HEIC bytes. */
    return {
      tag: "image_base64",
      mediaType: "image/jpeg",
      data: encodeBase64(new Uint8Array(buf)),
      filename,
    };
  }

  const { data: signData, error: signErr } = await admin.storage
    .from(MEDICAL_RECORDS_BUCKET)
    .createSignedUrl(file.storage_path, SIGNED_URL_EXPIRY_SEC);

  if (signErr || !signData?.signedUrl) {
    console.error("[parse-medical-record] createSignedUrl", signErr);
    return {
      tag: "skipped",
      reason: "Could not create access link for scan",
      filename,
    };
  }

  return { tag: "image_url", url: signData.signedUrl, filename };
}

function contentBlocksFromPrepared(
  prepared: ClaudeFilePrepared[],
): { blocks: unknown[]; warnings: { filename: string; reason: string }[] } {
  const blocks: unknown[] = [];
  const warnings: { filename: string; reason: string }[] = [];

  for (const p of prepared) {
    if (p.tag === "skipped") {
      warnings.push({ filename: p.filename, reason: p.reason });
      continue;
    }
    if (p.tag === "image_url") {
      blocks.push({
        type: "image",
        source: { type: "url", url: p.url },
      });
    } else if (p.tag === "image_base64") {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: p.mediaType,
          data: p.data,
        },
      });
    } else if (p.tag === "pdf_base64") {
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: p.data,
        },
      });
    }
  }

  return { blocks, warnings };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser();
    if (userErr || !user) {
      return json({ error: "unauthorized" }, 401);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    if (!apiKey) {
      console.error("[parse-medical-record] missing ANTHROPIC_API_KEY");
      return json({ error: "server_misconfigured" }, 500);
    }

    let body: {
      pet_id?: string;
      medical_record_id?: string;
      file_ids?: string[];
    };
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const petId = typeof body.pet_id === "string" ? body.pet_id : null;
    const medicalRecordId =
      typeof body.medical_record_id === "string" ? body.medical_record_id : null;
    const explicitFileIds = Array.isArray(body.file_ids)
      ? body.file_ids.filter((x): x is string => typeof x === "string")
      : null;
    if (!petId || !medicalRecordId) {
      return json({ error: "invalid_request" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    /** Access check: user must own the pet or be a co-carer. RLS on the follow-up client-side
     *  inserts will enforce per-action permissions (can_manage_medications / _vaccinations). */
    const { data: petRow, error: petErr } = await supabaseAdmin
      .from("pets")
      .select("id, name, owner_id")
      .eq("id", petId)
      .maybeSingle();

    if (petErr || !petRow) {
      return json({ error: "pet_not_found" }, 404);
    }

    let hasAccess = petRow.owner_id === user.id;
    if (!hasAccess) {
      const { data: coCare } = await supabaseAdmin
        .from("pet_co_carers")
        .select("id")
        .eq("pet_id", petId)
        .eq("user_id", user.id)
        .maybeSingle();
      hasAccess = Boolean(coCare?.id);
    }
    if (!hasAccess) {
      return json({ error: "forbidden" }, 403);
    }

    /** Medical record must belong to the same pet (prevents cross-pet data leakage via IDs). */
    const { data: recordRow, error: recordErr } = await supabaseAdmin
      .from("pet_medical_records")
      .select("id, pet_id")
      .eq("id", medicalRecordId)
      .maybeSingle();

    if (recordErr || !recordRow || recordRow.pet_id !== petId) {
      return json({ error: "record_not_found" }, 404);
    }

    let filesQuery = supabaseAdmin
      .from("pet_medical_record_files")
      .select("id, storage_path, mime_type, original_filename, file_size_bytes")
      .eq("medical_record_id", medicalRecordId)
      .order("created_at", { ascending: true });

    if (explicitFileIds && explicitFileIds.length > 0) {
      filesQuery = filesQuery.in("id", explicitFileIds);
    }

    /** Read one extra row so we can surface a truncation warning when the caller
     *  exceeded `MAX_FILES_PER_CALL` instead of silently dropping pages. */
    const { data: fileRowsAll, error: filesErr } = await filesQuery.limit(
      MAX_FILES_PER_CALL + 1,
    );

    if (filesErr) {
      console.error("[parse-medical-record] files", filesErr);
      return json({ error: "files_load_failed" }, 500);
    }
    if (!fileRowsAll || fileRowsAll.length === 0) {
      return json({ error: "no_files" }, 400);
    }

    const fileRows = (fileRowsAll as FileRow[]).slice(0, MAX_FILES_PER_CALL);
    const overflowCount = fileRowsAll.length - fileRows.length;

    const globalWarnings: { filename: string; reason: string }[] = [];
    if (overflowCount > 0) {
      globalWarnings.push({
        filename: `${overflowCount} file${overflowCount === 1 ? "" : "s"} skipped`,
        reason: `Only the first ${MAX_FILES_PER_CALL} files per scan are processed. Re-run the scan to include the rest, or combine pages into a PDF.`,
      });
    }

    const [medsRes, vacsRes] = await Promise.all([
      supabaseAdmin
        .from("pet_medications")
        .select("id, name, dosage, condition")
        .eq("pet_id", petId),
      supabaseAdmin
        .from("pet_vaccinations")
        .select("id, name, administered_on, expires_on")
        .eq("pet_id", petId),
    ]);

    const existingMeds = (medsRes.data ?? []) as ExistingMed[];
    const existingVacs = (vacsRes.data ?? []) as ExistingVac[];

    const systemPrompt = buildSystemPrompt(
      petRow.name ?? "",
      existingMeds,
      existingVacs,
    );

    const model = Deno.env.get("CRITTR_OCR_MODEL") ?? DEFAULT_MODEL;

    type BatchOutcome = {
      parsed: Partial<ExtractionResult> | null;
      warnings: { filename: string; reason: string }[];
      error: string | null;
    };

    /** One Anthropic call per unit. Raster images (except HEIC) are grouped into URL-only
     *  batches so this function never holds more than one PDF/HEIC base64 at a time. */
    const workUnits: ClaudeFilePrepared[][] = [];
    let imageUrlBatch: ClaudeFilePrepared[] = [];

    const flushImageUrlBatch = () => {
      if (imageUrlBatch.length === 0) return;
      workUnits.push(imageUrlBatch);
      imageUrlBatch = [];
    };

    for (const file of fileRows) {
      const prepared = await prepareClaudeFileInput(supabaseAdmin, file);
      if (prepared.tag === "skipped") {
        globalWarnings.push({
          filename: prepared.filename,
          reason: prepared.reason,
        });
        continue;
      }
      if (prepared.tag === "image_url") {
        imageUrlBatch.push(prepared);
        if (imageUrlBatch.length >= IMAGE_URL_BATCH_SIZE) flushImageUrlBatch();
      } else {
        flushImageUrlBatch();
        workUnits.push([prepared]);
      }
    }
    flushImageUrlBatch();

    const runAnthropicJob = async (
      preparedSlice: ClaudeFilePrepared[],
      batchIndex: number,
      totalBatches: number,
    ): Promise<BatchOutcome> => {
      const { blocks: rawBlocks, warnings } = contentBlocksFromPrepared(
        preparedSlice,
      );

      if (rawBlocks.length === 0) {
        return { parsed: null, warnings, error: null };
      }

      let contentBlocks: unknown[] = [...rawBlocks];
      const fileCount = rawBlocks.length;

      contentBlocks.push({
        type: "text",
        text:
          totalBatches > 1
            ? `Extract every medication and vaccination that appears on these ${fileCount} document page(s) (batch ${batchIndex + 1} of ${totalBatches}). Use the record_extracted_medical_data tool to respond; do not reply with free-form text. If the pages don't contain any medications or vaccinations, return empty arrays.`
            : "Extract every medication and vaccination that appears on the attached document(s). Use the record_extracted_medical_data tool to respond; do not reply with free-form text.",
      });

      let anthropicRes: Response;
      try {
        anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            /** PDF support is GA; the beta header is still accepted and safe to send. */
            "anthropic-beta": "pdfs-2024-09-25",
          },
          body: JSON.stringify({
            model,
            max_tokens: MAX_OUTPUT_TOKENS,
            system: systemPrompt,
            tools: [EXTRACTION_TOOL],
            tool_choice: {
              type: "tool",
              name: EXTRACTION_TOOL.name,
            },
            messages: [{ role: "user", content: contentBlocks }],
          }),
        });
      } finally {
        contentBlocks = [];
      }

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        console.error(
          "[parse-medical-record] anthropic",
          anthropicRes.status,
          errText.slice(0, 500),
        );
        if (anthropicRes.status === 429 || anthropicRes.status >= 500) {
          return {
            parsed: null,
            warnings,
            error: `ai_upstream_${anthropicRes.status}`,
          };
        }
        return {
          parsed: null,
          warnings,
          error: `ai_upstream_${anthropicRes.status}`,
        };
      }

      const anthropicJson = (await anthropicRes.json()) as {
        content?: Array<{ type: string; name?: string; input?: unknown }>;
      };

      const toolBlock = (anthropicJson.content ?? []).find(
        (b) => b.type === "tool_use" && b.name === EXTRACTION_TOOL.name,
      );

      if (!toolBlock || !toolBlock.input || typeof toolBlock.input !== "object") {
        console.error(
          "[parse-medical-record] no tool_use block",
          JSON.stringify(anthropicJson).slice(0, 500),
        );
        return { parsed: null, warnings, error: "empty_result" };
      }

      return {
        parsed: toolBlock.input as Partial<ExtractionResult>,
        warnings,
        error: null,
      };
    };

    const totalBatches = workUnits.length;
    const outcomes: BatchOutcome[] = [];
    for (let i = 0; i < workUnits.length; i += MAX_CONCURRENT_BATCHES) {
      const slice = workUnits.slice(i, i + MAX_CONCURRENT_BATCHES);
      const results = await Promise.all(
        slice.map((unit, j) =>
          runAnthropicJob(unit, i + j, totalBatches),
        ),
      );
      outcomes.push(...results);
    }

    const warnings: { filename: string; reason: string }[] = [...globalWarnings];
    const upstreamErrors: string[] = [];
    const mergedMeds = new Map<string, ExtractedMedication>();
    const mergedVacs = new Map<string, ExtractedVaccination>();
    const petNamesDetected: string[] = [];

    const confidenceRank = (c: "low" | "medium" | "high"): number =>
      c === "high" ? 2 : c === "medium" ? 1 : 0;

    const mergeMed = (
      next: Omit<ExtractedMedication, "duplicate_of_id">,
    ): void => {
      const key = canonicalKey(next.name) || next.name.toLowerCase();
      const existing = mergedMeds.get(key);
      const withDup: ExtractedMedication = {
        ...next,
        duplicate_of_id: findDuplicateId(next.name, existingMeds),
      };
      if (!existing) {
        mergedMeds.set(key, withDup);
        return;
      }
      /** Keep the entry with the higher confidence and fill missing fields from both. */
      const base =
        confidenceRank(withDup.confidence) > confidenceRank(existing.confidence)
          ? withDup
          : existing;
      const other = base === existing ? withDup : existing;
      const merged: ExtractedMedication = {
        name: base.name,
        dosage: base.dosage ?? other.dosage,
        frequency: base.frequency ?? other.frequency,
        condition: base.condition ?? other.condition,
        notes: base.notes ?? other.notes,
        doses_per_period: base.doses_per_period ?? other.doses_per_period,
        dose_period: base.dose_period ?? other.dose_period,
        interval_count: base.interval_count ?? other.interval_count,
        interval_unit: base.interval_unit ?? other.interval_unit,
        last_given_on: base.last_given_on ?? other.last_given_on,
        next_due_date: base.next_due_date ?? other.next_due_date,
        confidence: base.confidence,
        duplicate_of_id: base.duplicate_of_id ?? other.duplicate_of_id,
      };
      mergedMeds.set(key, merged);
    };

    const mergeVac = (
      next: Omit<ExtractedVaccination, "duplicate_of_id">,
    ): void => {
      const key = canonicalKey(next.name) || next.name.toLowerCase();
      const existing = mergedVacs.get(key);
      const withDup: ExtractedVaccination = {
        ...next,
        duplicate_of_id: findDuplicateId(next.name, existingVacs),
      };
      if (!existing) {
        mergedVacs.set(key, withDup);
        return;
      }
      const base =
        confidenceRank(withDup.confidence) > confidenceRank(existing.confidence)
          ? withDup
          : existing;
      const other = base === existing ? withDup : existing;
      const merged: ExtractedVaccination = {
        name: base.name,
        administered_on: base.administered_on ?? other.administered_on,
        expires_on: base.expires_on ?? other.expires_on,
        frequency_label: base.frequency_label ?? other.frequency_label,
        administered_by: base.administered_by ?? other.administered_by,
        lot_number: base.lot_number ?? other.lot_number,
        notes: base.notes ?? other.notes,
        confidence: base.confidence,
        duplicate_of_id: base.duplicate_of_id ?? other.duplicate_of_id,
      };
      mergedVacs.set(key, merged);
    };

    let anyBatchSucceeded = false;
    for (const outcome of outcomes) {
      warnings.push(...outcome.warnings);
      if (outcome.error) {
        upstreamErrors.push(outcome.error);
        continue;
      }
      if (!outcome.parsed) continue;
      anyBatchSucceeded = true;

      if (typeof outcome.parsed.pet_name_detected === "string") {
        petNamesDetected.push(outcome.parsed.pet_name_detected);
      }

      const rawMeds = Array.isArray(outcome.parsed.medications)
        ? outcome.parsed.medications
        : [];
      for (const m of rawMeds) {
        if (typeof m?.name !== "string" || m.name.trim().length === 0) continue;
        mergeMed({
          name: m.name.trim(),
          dosage: m.dosage ?? null,
          frequency: m.frequency ?? null,
          condition: m.condition ?? null,
          notes: m.notes ?? null,
          doses_per_period:
            typeof m.doses_per_period === "number" ? m.doses_per_period : null,
          dose_period: m.dose_period ?? null,
          interval_count:
            typeof m.interval_count === "number" ? m.interval_count : null,
          interval_unit: m.interval_unit ?? null,
          last_given_on: m.last_given_on ?? null,
          next_due_date: m.next_due_date ?? null,
          confidence:
            m.confidence === "low" || m.confidence === "high"
              ? m.confidence
              : "medium",
        });
      }

      const rawVacs = Array.isArray(outcome.parsed.vaccinations)
        ? outcome.parsed.vaccinations
        : [];
      for (const v of rawVacs) {
        if (typeof v?.name !== "string" || v.name.trim().length === 0) continue;
        mergeVac({
          name: v.name.trim(),
          administered_on: v.administered_on ?? null,
          expires_on: v.expires_on ?? null,
          frequency_label: v.frequency_label ?? null,
          administered_by: v.administered_by ?? null,
          lot_number: v.lot_number ?? null,
          notes: v.notes ?? null,
          confidence:
            v.confidence === "low" || v.confidence === "high"
              ? v.confidence
              : "medium",
        });
      }
    }

    /** If every batch failed upstream, propagate as 502 so the client's retry UX kicks in.
     *  A mix of success + failure returns the partial result with warnings per file. */
    if (!anyBatchSucceeded) {
      if (
        warnings.length > 0 &&
        upstreamErrors.length === 0 &&
        mergedMeds.size === 0 &&
        mergedVacs.size === 0
      ) {
        return json(
          {
            error: "no_scannable_files",
            message:
              "None of the files could be scanned. Supported formats: images (JPEG/PNG/WebP/HEIC) and PDFs under 10 MB.",
            warnings,
          },
          400,
        );
      }
      return json(
        {
          error: "ai_upstream_error",
          message:
            "The document scanner is temporarily unavailable. Please try again shortly.",
          warnings,
        },
        502,
      );
    }

    if (upstreamErrors.length > 0) {
      warnings.push({
        filename: `${upstreamErrors.length} batch${upstreamErrors.length === 1 ? "" : "es"} failed`,
        reason:
          "Some pages couldn't be scanned because of a temporary issue with the AI service. Try again to include them.",
      });
    }

    /** Pick the most common non-empty pet name across batches (usually all the same). */
    const petNameDetected = (() => {
      const counts = new Map<string, number>();
      for (const n of petNamesDetected) {
        const t = n.trim();
        if (!t) continue;
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
      let best: string | null = null;
      let bestCount = 0;
      for (const [name, count] of counts) {
        if (count > bestCount) {
          best = name;
          bestCount = count;
        }
      }
      return best;
    })();

    return json(
      {
        pet_id: petId,
        pet_name: petRow.name ?? null,
        pet_name_detected: petNameDetected,
        medications: Array.from(mergedMeds.values()),
        vaccinations: Array.from(mergedVacs.values()),
        warnings,
      },
      200,
    );
  } catch (e) {
    console.error("[parse-medical-record]", e);
    return json({ error: "internal_error", message: String(e) }, 500);
  }
});
