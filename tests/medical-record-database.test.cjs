const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./database.cjs");
const owner = "11111111-1111-4111-8111-111111111111";
const carer = "22222222-2222-4222-8222-222222222222";
const stranger = "33333333-3333-4333-8333-333333333333";
const fileId = "44444444-4444-4444-8444-444444444444";

test("medical records enforce Pro, attachment ownership, retained reads, and durable deletion", async (t) => {
  const db = await load();
  t.after(() => db.close());
  const scalar = async (sql, args = []) =>
    Object.values((await db.query(sql, args)).rows[0])[0];
  const as = async (id, role = "authenticated") =>
    db.exec(
      `RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SELECT set_config('request.jwt.claim.role','${role}',false); SET ROLE ${role};`,
    );
  await db.query(
    "INSERT INTO auth.users(id,email) VALUES($1,'owner@example.invalid'),($2,'carer@example.invalid'),($3,'stranger@example.invalid')",
    [owner, carer, stranger],
  );
  await as(owner, "service_role");
  await db.query(
    "UPDATE profiles SET crittr_pro_active=true,crittr_pro_until=now()+interval '1 month',crittr_pro_last_synced_at=now(),subscription_environment='production' WHERE id IN ($1,$2)",
    [owner, carer],
  );
  await as(owner);
  const pet = await scalar(
    "INSERT INTO pets(owner_id,name) VALUES($1,'Pet') RETURNING id",
    [owner],
  );
  const secondPet = await scalar(
    "INSERT INTO pets(owner_id,name) VALUES($1,'Other pet') RETURNING id",
    [owner],
  );
  const record = await scalar(
    "INSERT INTO pet_medical_records(pet_id,title,created_by) VALUES($1,'History',$2) RETURNING id",
    [pet, owner],
  );
  const otherRecord = await scalar(
    "INSERT INTO pet_medical_records(pet_id,title,created_by) VALUES($1,'History',$2) RETURNING id",
    [secondPet, owner],
  );
  const path = `${pet}/${record}/${fileId}/scan.pdf`;
  const insertFile = (
    pathValue = path,
    recordValue = record,
    idValue = fileId,
    size = 42,
  ) =>
    db.query(
      "INSERT INTO pet_medical_record_files(id,medical_record_id,storage_path,file_size_bytes) VALUES($1,$2,$3,$4)",
      [idValue, recordValue, pathValue, size],
    );
  await t.test("uploads must match an existing record and object", async () => {
    await assert.rejects(() => insertFile(), /Upload the attachment/);
    await assert.rejects(
      () =>
        db.query(
          "INSERT INTO storage.objects(bucket_id,name,owner) VALUES('medical-records',$1,$2)",
          [`${pet}/missing/record.pdf`, owner],
        ),
      /row-level security/,
    );
    await db.query(
      "INSERT INTO storage.objects(bucket_id,name,owner) VALUES('medical-records',$1,$2)",
      [path, owner],
    );
    await assert.rejects(() => insertFile(path, otherRecord), /does not match/);
    await assert.rejects(
      () => insertFile(path, record, fileId, 26214401),
      /medical_record_file_size/,
    );
    await insertFile();
    assert.equal(
      Number(
        await scalar(
          "SELECT file_size_limit FROM storage.buckets WHERE id='medical-records'",
        ),
      ),
      26214400,
    );
    await assert.rejects(
      () =>
        db.query("UPDATE pet_medical_records SET pet_id=$1 WHERE id=$2", [
          secondPet,
          record,
        ]),
      /identity cannot be changed/,
    );
  });
  await t.test(
    "unlinked uploads have a grace period and expired upload paths cannot be attached",
    async () => {
      await as(owner, "service_role");
      assert.equal(
        Number(
          await scalar(
            "SELECT count(*) FROM medical_record_storage_deletions WHERE storage_path=$1",
            [path],
          ),
        ),
        0,
      );
      const orphanId = "99999999-9999-4999-8999-999999999999";
      const orphanPath = `${pet}/${record}/${orphanId}/abandoned.pdf`;
      await db.query(
        "INSERT INTO storage.objects(bucket_id,name,owner) VALUES('medical-records',$1,$2)",
        [orphanPath, owner],
      );
      assert.equal(
        await scalar(
          "SELECT ready_at > now()+interval '23 hours' FROM medical_record_storage_deletions WHERE storage_path=$1",
          [orphanPath],
        ),
        true,
      );
      await db.query(
        "UPDATE medical_record_storage_deletions SET ready_at=now()-interval '1 second' WHERE storage_path=$1",
        [orphanPath],
      );
      await assert.rejects(
        () => insertFile(orphanPath, record, orphanId),
        /pending deletion/,
      );
      await as(owner);
    },
  );
  await t.test(
    "a view-only co-carer and unrelated account cannot upload or delete files",
    async () => {
      await as(owner, "service_role");
      await db.query(
        "INSERT INTO pet_co_carers(pet_id,user_id,invited_by,permissions) VALUES($1,$2,$3,'{\"can_manage_pet_records\":false}')",
        [pet, carer, owner],
      );
      await as(carer);
      assert.equal(
        Number(await scalar("SELECT count(*) FROM pet_medical_record_files")),
        1,
      );
      await assert.rejects(
        () =>
          db.query(
            "INSERT INTO storage.objects(bucket_id,name,owner) VALUES('medical-records',$1,$2)",
            [
              `${pet}/${record}/55555555-5555-4555-8555-555555555555/new.pdf`,
              carer,
            ],
          ),
        /row-level security/,
      );
      assert.equal(
        (
          await db.query(
            "DELETE FROM pet_medical_record_files WHERE id=$1 RETURNING id",
            [fileId],
          )
        ).rows.length,
        0,
      );
      await as(stranger);
      assert.equal(
        Number(await scalar("SELECT count(*) FROM pet_medical_record_files")),
        0,
      );
      assert.equal(
        Number(
          await scalar(
            "SELECT count(*) FROM storage.objects WHERE bucket_id='medical-records'",
          ),
        ),
        0,
      );
    },
  );
  await t.test(
    "expired Pro prevents new uploads while preserving existing records and file reads",
    async () => {
      await as(owner, "service_role");
      await db.query(
        "UPDATE profiles SET crittr_pro_until=now()-interval '1 second' WHERE id=$1",
        [owner],
      );
      const nextId = "55555555-5555-4555-8555-555555555555";
      const nextPath = `${pet}/${record}/${nextId}/next.pdf`;
      await db.query(
        "INSERT INTO storage.objects(bucket_id,name,owner) VALUES('medical-records',$1,$2)",
        [nextPath, owner],
      );
      await as(owner);
      assert.equal(
        Number(await scalar("SELECT count(*) FROM pet_medical_record_files")),
        1,
      );
      assert.equal(
        Number(
          await scalar("SELECT count(*) FROM storage.objects WHERE name=$1", [
            path,
          ]),
        ),
        1,
      );
      await assert.rejects(
        () =>
          db.query(
            "INSERT INTO pet_medical_records(pet_id,title,created_by) VALUES($1,'Blocked',$2)",
            [pet, owner],
          ),
        /row-level security/,
      );
      await assert.rejects(
        () => insertFile(nextPath, record, nextId),
        /row-level security/,
      );
      await assert.rejects(
        () =>
          db.query(
            "INSERT INTO storage.objects(bucket_id,name,owner) VALUES('medical-records',$1,$2)",
            [
              `${pet}/${record}/66666666-6666-4666-8666-666666666666/new.pdf`,
              owner,
            ],
          ),
        /row-level security/,
      );
    },
  );
  await t.test(
    "deletions queue storage cleanup transactionally and clients cannot consume the queue",
    async () => {
      await as(owner);
      await db.query("DELETE FROM pet_medical_records WHERE id=$1", [record]);
      assert.equal(
        Number(await scalar("SELECT count(*) FROM pet_medical_record_files")),
        0,
      );
      assert.equal(
        Number(
          await scalar("SELECT count(*) FROM medical_record_storage_deletions"),
        ),
        0,
      ); // RLS hides service queue.
      await as(owner, "service_role");
      assert.equal(
        await scalar(
          "SELECT storage_path FROM medical_record_storage_deletions WHERE reason='deletion'",
        ),
        path,
      );
      await db.query(
        "UPDATE profiles SET crittr_pro_until=now()+interval '1 month' WHERE id=$1",
        [owner],
      );
      const cascadeId = "77777777-7777-4777-8777-777777777777";
      const cascadePath = `${secondPet}/${otherRecord}/${cascadeId}/cascade.pdf`;
      await db.query(
        "INSERT INTO storage.objects(bucket_id,name,owner) VALUES('medical-records',$1,$2)",
        [cascadePath, owner],
      );
      await insertFile(cascadePath, otherRecord, cascadeId);
      await as(owner);
      await db.query("DELETE FROM pets WHERE id=$1", [secondPet]);
      await as(owner, "service_role");
      assert.equal(
        Number(
          await scalar(
            "SELECT count(*) FROM medical_record_storage_deletions WHERE reason='deletion'",
          ),
        ),
        2,
      );
    },
  );
  await t.test(
    "account cascades enqueue the remaining files and migration reruns preserve pending cleanup",
    async () => {
      await as(owner, "service_role");
      const accountRecord = await scalar(
        "INSERT INTO pet_medical_records(pet_id,title,created_by) VALUES($1,'Account test',$2) RETURNING id",
        [pet, owner],
      );
      const accountFile = "88888888-8888-4888-8888-888888888888";
      const accountPath = `${pet}/${accountRecord}/${accountFile}/account.pdf`;
      await db.query(
        "INSERT INTO storage.objects(bucket_id,name,owner) VALUES('medical-records',$1,$2)",
        [accountPath, owner],
      );
      await insertFile(accountPath, accountRecord, accountFile);
      await db.exec("RESET ROLE");
      await db.query("DELETE FROM auth.users WHERE id=$1", [owner]);
      assert.equal(
        await scalar(
          "SELECT storage_path FROM medical_record_storage_deletions WHERE storage_path=$1",
          [accountPath],
        ),
        accountPath,
      );
      const before = Number(
        await scalar("SELECT count(*) FROM medical_record_storage_deletions"),
      );
      await db.exec(
        require("node:fs").readFileSync(
          "supabase/migrations/20261028150000_medical_record_integrity.sql",
          "utf8",
        ),
      );
      assert.equal(
        Number(
          await scalar("SELECT count(*) FROM medical_record_storage_deletions"),
        ),
        before,
      );
    },
  );
});
