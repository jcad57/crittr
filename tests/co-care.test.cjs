const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { load } = require("./database.cjs");
const { loadTS } = require("./load-typescript.cjs");

const repair = "20261026143000_accept_co_care_invite.sql";
const billing = "20261026120000_subscription_reliability.sql";
const sharing = "20261026123000_co_care_integrity.sql";
const owner = "11111111-1111-4111-8111-111111111111";
const carer = "22222222-2222-4222-8222-222222222222";
const stranger = "33333333-3333-4333-8333-333333333333";

test("acceptance repair works on the deployed schema without co-care integrity triggers", async (t) => {
  const db = await load({ skipMigrations: [billing, sharing, repair, "20261028160000_revised_free_pro_tiers.sql"] });
  t.after(() => db.close());
  const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
  const as = (id, role = "authenticated") => db.exec(
    `RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SELECT set_config('request.jwt.claim.role','${role}',false); SET ROLE ${role};`,
  );
  await db.exec(fs.readFileSync("docs/sql/install-subscription-sync.sql", "utf8"));
  assert.equal(await scalar("SELECT to_regprocedure('public.accept_co_care_invite(uuid)')"), null);
  for (const [id, name] of [[owner, "owner"], [carer, "carer"], [stranger, "stranger"]]) {
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2)", [id, `${name}@example.invalid`]);
  }
  const pro = async (id) => {
    await as(id, "service_role");
    await db.query("UPDATE profiles SET crittr_pro_active=true,crittr_pro_until=NULL,crittr_pro_last_synced_at=now(),subscription_environment='promotional' WHERE id=$1", [id]);
  };
  await pro(owner);
  await pro(carer);
  await as(owner);
  const pet = await scalar("INSERT INTO pets(owner_id,name) VALUES($1,'Shared pet') RETURNING id", [owner]);
  const permissions = { can_log_activities: true, can_edit_pet_profile: false };
  const invite = await scalar("INSERT INTO co_carer_invites(pet_id,invited_by,invited_user_id,email,permissions) VALUES($1,$2,$3,'carer@example.invalid',$4) RETURNING id", [pet, owner, carer, permissions]);
  await db.exec("RESET ROLE");
  const policies = () => db.query("SELECT tablename,policyname,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname");
  const beforePolicies = await policies();
  const beforeInvites = await db.query("SELECT * FROM co_carer_invites");
  const migrationSql = fs.readFileSync(`supabase/migrations/${repair}`, "utf8");
  const installer = fs.readFileSync("docs/sql/install-co-care-acceptance.sql", "utf8");
  assert.ok(installer.includes(migrationSql), "SQL Editor installer must contain the exact migration");
  await db.exec(installer);
  await db.exec(installer);
  assert.deepEqual(await policies(), beforePolicies);
  assert.deepEqual(await db.query("SELECT * FROM co_carer_invites"), beforeInvites);
  assert.equal(await scalar("SELECT count(*) FROM pet_co_carers"), 0);
  assert.equal(await scalar("SELECT count(*) FROM pets"), 1);
  assert.equal(await scalar("SELECT has_function_privilege('anon','public.accept_co_care_invite(uuid)','EXECUTE')"), false);
  assert.equal(await scalar("SELECT has_function_privilege('authenticated','public.accept_co_care_invite(uuid)','EXECUTE')"), true);
  assert.equal(await scalar("SELECT pg_get_function_arguments('public.accept_co_care_invite(uuid)'::regprocedure)"), "target_invite uuid");

  await as(stranger);
  await assert.rejects(() => db.query("SELECT accept_co_care_invite($1)", [invite]), /Invitation not found/);
  await as(owner);
  await assert.rejects(() => db.query("SELECT accept_co_care_invite($1)", [invite]), /Invitation not found/);
  await as(carer, "service_role");
  await db.query("UPDATE profiles SET crittr_pro_active=false WHERE id=$1", [carer]);
  await as(carer);
  await assert.rejects(() => db.query("SELECT accept_co_care_invite($1)", [invite]), /Both accounts/);
  await pro(carer);
  await as(owner, "service_role");
  await db.query("UPDATE profiles SET crittr_pro_active=false WHERE id=$1", [owner]);
  await as(carer);
  await assert.rejects(() => db.query("SELECT accept_co_care_invite($1)", [invite]), /Both accounts/);
  assert.equal(await scalar("SELECT status FROM co_carer_invites WHERE id=$1", [invite]), "pending");
  assert.equal(await scalar("SELECT count(*) FROM pet_co_carers"), 0);
  await pro(owner);
  await as(carer);
  assert.equal(await scalar("SELECT accept_co_care_invite(target_invite => $1)", [invite]), pet);
  assert.equal(await scalar("SELECT accept_co_care_invite(target_invite => $1)", [invite]), pet);
  assert.equal(await scalar("SELECT status FROM co_carer_invites WHERE id=$1", [invite]), "accepted");
  assert.ok(await scalar("SELECT responded_at FROM co_carer_invites WHERE id=$1", [invite]));
  assert.deepEqual(await scalar("SELECT permissions FROM pet_co_carers WHERE pet_id=$1 AND user_id=$2", [pet, carer]), permissions);
  assert.equal(await scalar("SELECT count(*) FROM pet_co_carers"), 1);
  assert.equal(await scalar("SELECT count(*) FROM pets WHERE id=$1", [pet]), 1);
  await as(owner);
  await db.query("DELETE FROM pet_co_carers WHERE pet_id=$1 AND user_id=$2", [pet, carer]);
  await as(carer);
  await assert.rejects(() => db.query("SELECT accept_co_care_invite($1)", [invite]), /no longer pending/);
  await as(owner);
  const declined = await scalar("INSERT INTO co_carer_invites(pet_id,invited_by,invited_user_id,email) VALUES($1,$2,$3,'carer@example.invalid') RETURNING id", [pet, owner, carer]);
  await as(carer);
  await db.query("UPDATE co_carer_invites SET status='declined' WHERE id=$1", [declined]);
  await assert.rejects(() => db.query("SELECT accept_co_care_invite($1)", [declined]), /no longer pending/);

  // Installing this hotfix first must not block the later full rollout.
  await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.role','',false)");
  await db.exec(fs.readFileSync(`supabase/migrations/${billing}`, "utf8"));
  await db.exec(fs.readFileSync(`supabase/migrations/${sharing}`, "utf8"));
  await db.exec(migrationSql);
  await as(owner);
  const laterInvite = await scalar("INSERT INTO co_carer_invites(pet_id,invited_by,invited_user_id,email,permissions) VALUES($1,$2,$3,'carer@example.invalid',$4) RETURNING id", [pet, owner, carer, permissions]);
  await as(carer);
  assert.equal(await scalar("SELECT accept_co_care_invite($1)", [laterInvite]), pet);
  assert.equal(await scalar("SELECT status FROM co_carer_invites WHERE id=$1", [laterInvite]), "accepted");
});

test("notification acceptance sends the named invite parameter and propagates RPC failures", async () => {
  for (const rpcError of [null, { code: "PGRST202", message: "Function missing from schema cache" }]) {
    const calls = [], inserts = [], analytics = [];
    const invite = { id: "invite", pet_id: "pet", invited_by: "owner" };
    const supabase = {
      rpc: async (name, args) => {
        calls.push({ name, args });
        return name === "user_has_crittr_pro" ? { data: true, error: null } : { data: rpcError ? null : "pet", error: rpcError };
      },
      from: (table) => {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({ data: table === "co_carer_invites" ? invite : table === "pets" ? { name: "Shared pet" } : { first_name: "Co", last_name: "Carer" }, error: null }),
          insert: async (row) => { inserts.push({ table, row }); return { error: null }; },
        };
        return query;
      },
    };
    const { acceptInvite } = loadTS("services/coCare.ts", {
      "@/lib/supabase": { supabase },
      "@/lib/analytics": { trackCoCareInviteAccepted: () => analytics.push("accepted") },
      "@/types/database": { DEFAULT_CO_CARE_PERMISSIONS: {} },
    });
    if (rpcError) {
      await assert.rejects(() => acceptInvite("invite", "carer"), (err) => err === rpcError);
      assert.equal(inserts.length, 0);
      assert.equal(analytics.length, 0);
    } else {
      assert.equal((await acceptInvite("invite", "carer")).petId, "pet");
      assert.equal(inserts[0].row.type, "co_care_accepted");
      assert.equal(analytics.length, 1);
    }
    assert.equal(calls[0].name, "accept_co_care_invite");
    assert.equal(calls[0].args.target_invite, "invite");
    assert.equal(Object.keys(calls[0].args).length, 1);
  }
});

test("accepting an orphaned inbox invite returns an unavailable message instead of PGRST116", async () => {
  const { createClient } = require("@supabase/supabase-js");
  const requests = [];
  const client = createClient("https://example.supabase.co", "test-key", {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: async (url, options) => {
      requests.push(String(url));
      const singular = new Headers(options.headers).get("accept")?.includes("vnd.pgrst.object");
      return new Response(JSON.stringify(singular
        ? { code: "PGRST116", details: "The result contains 0 rows", message: "Cannot coerce the result to a single JSON object" }
        : []), { status: singular ? 406 : 200, headers: { "Content-Type": "application/json" } });
    } },
  });
  const module = loadTS("services/coCare.ts", {
    "@/lib/supabase": { supabase: client },
    "@/lib/analytics": {},
    "@/types/database": { DEFAULT_CO_CARE_PERMISSIONS: {} },
  });
  await assert.rejects(() => module.acceptInvite("deleted-invite", "carer"), (error) => error.message === module.CO_CARE_INVITE_UNAVAILABLE_MESSAGE);
  assert.equal(requests.length, 1, "a missing invite must not reach the acceptance RPC");
  assert.equal(new URL(requests[0]).searchParams.get("invited_user_id"), "eq.carer");
});

test("revocation during acceptance is unavailable while network/Pro errors remain retryable", async () => {
  const failures = [
    { stage: "lookup", error: { code: "NETWORK", message: "Network unavailable" } },
    { stage: "accept", error: { code: "42501", message: "Invitation not found" }, unavailable: true },
    { stage: "accept", error: { code: "42501", message: "Invitation is no longer pending" }, unavailable: true },
    { stage: "accept", error: { code: "42501", message: "Both accounts need Crittr Pro to share care" } },
  ];
  for (const failure of failures) {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({
      data: failure.stage === "lookup" ? null : { pet_id: "pet", invited_by: "owner" },
      error: failure.stage === "lookup" ? failure.error : null,
    }) };
    const module = loadTS("services/coCare.ts", {
      "@/lib/supabase": { supabase: {
        from: () => query,
        rpc: async (name) => name === "user_has_crittr_pro" ? { data: true, error: null } : { data: null, error: failure.error },
      } },
      "@/lib/analytics": {},
      "@/types/database": { DEFAULT_CO_CARE_PERMISSIONS: {} },
    });
    await assert.rejects(() => module.acceptInvite("invite", "carer"), (error) => failure.unavailable
      ? error.message === module.CO_CARE_INVITE_UNAVAILABLE_MESSAGE : error === failure.error);
  }
});

test("optional notification metadata cannot report failure after membership commits", async () => {
  const warnings = [];
  let committed = false;
  const module = loadTS("services/coCare.ts", {
    "@/lib/supabase": { supabase: {
      from: (table) => {
        const query = { select: () => query, eq: () => query, maybeSingle: async () => {
          if (table === "co_carer_invites") return { data: { pet_id: "pet", invited_by: "owner" }, error: null };
          assert.equal(committed, true);
          throw new Error("Metadata network error after acceptance");
        } };
        return query;
      },
      rpc: async (name) => {
        if (name === "user_has_crittr_pro") return { data: true, error: null };
        committed = true;
        return { data: "pet", error: null };
      },
    } },
    "@/lib/analytics": { trackCoCareInviteAccepted() {} },
    "@/types/database": { DEFAULT_CO_CARE_PERMISSIONS: {} },
  }, { console: { warn: (...args) => warnings.push(args) } });
  assert.equal((await module.acceptInvite("invite", "carer")).petId, "pet");
  assert.equal(warnings.length, 1);
});

test("a session refresh error cannot turn committed acceptance into a failed mutation", async () => {
  const invalidated = [], warnings = [];
  const keys = Object.fromEntries([
    "coCarersForPetKey", "notificationsKey", "pendingInvitesKey", "petDetailsQueryKey",
    "petsQueryKey", "sentInvitesForPetKey", "unreadNotificationCountKey",
  ].map((name) => [name, (id) => [name, id]]));
  const useAuthStore = Object.assign((selector) => selector({ session: { user: { id: "carer" } } }), {
    getState: () => ({ refreshAuthSession: async () => { throw new Error("Cannot coerce the result to a single JSON object"); } }),
  });
  const module = loadTS("hooks/mutations/useCoCareMutations.ts", {
    "@/lib/query/keys": keys,
    "@/lib/query/client": { queryClient: { invalidateQueries: async ({ queryKey }) => invalidated.push(queryKey) } },
    "@/services/coCare": {},
    "@/stores/authStore": { useAuthStore },
    "@tanstack/react-query": { useMutation: (options) => options },
  }, { console: { warn: (...args) => warnings.push(args) } });
  await module.useAcceptInviteMutation().onSuccess({ petId: "pet" });
  assert.ok(invalidated.some(([key]) => key === "petsQueryKey"));
  assert.ok(invalidated.some(([key]) => key === "notificationsKey"));
  assert.ok(invalidated.some(([key]) => key === "unreadNotificationCountKey"));
  assert.equal(warnings.length, 1);
});

test("invite channel uses membership lookup: email for new users, inbox/push for registered users", async () => {
  for (const registered of [false, true]) {
    for (const needsPro of registered ? [false, true] : [false]) {
      const inserts = [], emails = [];
      const { sendCoCareInvite } = loadTS("services/coCare.ts", {
        "@/lib/supabase": { supabase: {
          rpc: async (name) => ({ data: name === "validate_co_care_invite_send"
            ? { ok: true, code: registered ? (needsPro ? "registered_needs_pro" : "registered_pro") : "email_only" }
            : (registered ? [{ id: "carer" }] : []), error: null }),
          from: (table) => ({ insert: (row) => {
            inserts.push({ table, row });
            return { select: () => ({ single: async () => ({ data: { id: "invite", ...row }, error: null }) }) };
          } }),
          functions: { invoke: async (name, options) => { emails.push({ name, ...options }); return { data: { ok: true } }; } },
        } },
        "@/lib/analytics": { trackCoCareInviteSent() {} },
        "@/types/database": { DEFAULT_CO_CARE_PERMISSIONS: {} },
      });
      const result = await sendCoCareInvite("pet", "owner", "  Carer@Example.Invalid  ");
      assert.equal(result.isRegistered, registered);
      assert.equal(result.inviteeNeedsPro, undefined);
      assert.equal(inserts[0].table, "co_carer_invites");
      assert.equal(inserts[0].row.invited_user_id, registered ? "carer" : null);
      assert.equal(inserts[0].row.email, "carer@example.invalid");
      assert.equal(emails.length, registered ? 0 : 1);
      if (!registered) {
        assert.equal(emails[0].name, "send-co-care-invite");
        assert.equal(emails[0].body.inviteeEmail, "carer@example.invalid");
        assert.equal(result.inviteEmailSent, true);
      }
    }
  }
});

test("lookup failures never misclassify a registered invitee as an email-only recipient", async () => {
  const lookupError = { message: "Lookup unavailable" };
  const { sendCoCareInvite } = loadTS("services/coCare.ts", {
    "@/lib/supabase": { supabase: {
      rpc: async (name) => name === "validate_co_care_invite_send"
        ? { data: { ok: true, code: "registered_pro" }, error: null }
        : { data: null, error: lookupError },
      from: () => { throw new Error("Must not create an unlinked invite"); },
      functions: { invoke: () => { throw new Error("Must not send email"); } },
    } },
    "@/lib/analytics": {},
    "@/types/database": { DEFAULT_CO_CARE_PERMISSIONS: {} },
  });
  await assert.rejects(() => sendCoCareInvite("pet", "owner", "carer@example.invalid"), (err) => err === lookupError);
});
