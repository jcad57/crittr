const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");

test("document serving checks user and row access before streaming with the same JWT", async () => {
  let handler,
    authorized = true,
    visible = true,
    fetches = 0;
  loadTS(
    "supabase/functions/serve-medical-record-file/index.ts",
    {
      "jsr:@supabase/functions-js/edge-runtime.d.ts": {},
      "https://esm.sh/@supabase/supabase-js@2.49.1": {
        createClient: () => ({
          auth: {
            getUser: async () => ({
              data: { user: authorized ? { id: "owner" } : null },
            }),
          },
          from: () => ({
            select() {
              return this;
            },
            eq() {
              return this;
            },
            maybeSingle: async () => ({
              data: visible
                ? {
                    storage_path: "pet/record/file/vet record.pdf",
                    mime_type: "application/pdf",
                    original_filename: "vet record.pdf",
                  }
                : null,
            }),
          }),
        }),
      },
    },
    {
      URL,
      fetch: async (url, options) => {
        fetches++;
        assert.match(
          url,
          /\/storage\/v1\/object\/authenticated\/medical-records\/pet\/record\/file\/vet%20record\.pdf$/,
        );
        assert.equal(options.headers.Authorization, "Bearer user-token");
        return new Response(new Uint8Array([37, 80, 68, 70]));
      },
      Deno: {
        env: {
          get: (key) =>
            key === "SUPABASE_URL" ? "https://supabase.invalid" : "anon",
        },
        serve: (callback) => {
          handler = callback;
        },
      },
    },
  );
  const request = () =>
    new Request(
      "https://file.invalid?file_id=11111111-1111-4111-8111-111111111111",
      { headers: { authorization: "Bearer user-token" } },
    );
  assert.equal(
    (await handler(new Request("https://file.invalid"))).status,
    401,
  );
  authorized = false;
  assert.equal((await handler(request())).status, 401);
  authorized = true;
  visible = false;
  assert.equal((await handler(request())).status, 404);
  assert.equal(fetches, 0);
  visible = true;
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "%PDF");
  assert.equal(
    response.headers.get("cache-control"),
    "private, max-age=0, no-store",
  );
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("cleanup worker is service-only, preserves linked files, and retains failed jobs for retry", async () => {
  let handler,
    fail = false,
    acknowledged = 0;
  const removed = [];
  loadTS(
    "supabase/functions/cleanup-medical-record-storage/index.ts",
    {
      "jsr:@supabase/functions-js/edge-runtime.d.ts": {},
      "https://esm.sh/@supabase/supabase-js@2.49.1": {
        createClient: () => ({
          from: (table) => ({
            select() {
              return this;
            },
            lte: (column) => {
              assert.equal(column, "ready_at");
              return {
                order: () => ({
                  limit: async (count) => {
                    assert.equal(count, 100);
                    return {
                      data: [
                        { id: "1", storage_path: "orphan" },
                        { id: "2", storage_path: "linked" },
                      ],
                    };
                  },
                }),
              };
            },
            in: async () => ({
              data:
                table === "pet_medical_record_files"
                  ? [{ storage_path: "linked" }]
                  : [],
            }),
            delete: () => ({
              in: async () => {
                acknowledged++;
                return {};
              },
            }),
          }),
          storage: {
            from: () => ({
              remove: async (paths) => {
                removed.push(...paths);
                return { error: fail ? Error("offline") : null };
              },
            }),
          },
        }),
      },
    },
    {
      console: { error() {} },
      Deno: {
        env: { get: () => "worker-secret" },
        serve: (callback) => {
          handler = callback;
        },
      },
    },
  );
  const request = (secret = "worker-secret") =>
    new Request("https://worker.invalid", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
  assert.equal((await handler(request("user-token"))).status, 401);
  assert.equal(removed.length, 0);
  fail = true;
  assert.equal((await handler(request())).status, 503);
  assert.equal(acknowledged, 0);
  fail = false;
  assert.equal((await handler(request())).status, 200);
  assert.equal(acknowledged, 1);
  assert.deepEqual(removed, ["orphan", "orphan"]);
});
