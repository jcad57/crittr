const fs = require("node:fs"),
  path = require("node:path");
const base = "@electric-sql/pglite";
const { PGlite } = require(base);
const { pg_trgm } = require(base + "/contrib/pg_trgm");
async function load({ skipMigrations = [], beforeMigration } = {}) {
  const db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE SCHEMA storage;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
 CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}', encrypted_password text, created_at timestamptz DEFAULT now());
 CREATE TABLE auth.identities (id uuid, user_id uuid, provider text, identity_data jsonb);
 CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint);
 CREATE TABLE storage.objects (id uuid DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;
 CREATE PUBLICATION supabase_realtime;
 GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
 `);
  const files = fs
    .readdirSync("supabase/migrations")
    .filter((p) => p.endsWith(".sql") && !skipMigrations.includes(p))
    .sort();
  for (const file of files) {
    try {
      if (beforeMigration) await beforeMigration(db, file);
      await db.exec(
        fs.readFileSync(path.join("supabase/migrations", file), "utf8"),
      );
    } catch (e) {
      throw new Error(file + ": " + e.message, { cause: e });
    }
  }
  await db.exec(`GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public,storage TO authenticated,service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated,service_role;
 DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['billing_test_accounts','billing_reconciliation','billing_webhook_events','billing_admin_grants'] LOOP
   IF to_regclass('public.' || t) IS NOT NULL THEN EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t); END IF;
  END LOOP;
 END $$;`);
  return db;
}
module.exports = { load };
if (require.main === module)
  load()
    .then(async (db) => {
      console.log("All migrations applied successfully");
      await db.close();
    })
    .catch((e) => {
      console.error(e.message);
      console.error(e.cause?.detail || "");
      process.exit(1);
    });
