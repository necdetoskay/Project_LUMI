import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.MANAGED_ASSET_CANON_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("MANAGED_ASSET_CANON_TEST_DATABASE_URL is required");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationSql = await readFile(
  resolve(
    __dirname,
    "..",
    "migrations",
    "0082_managed_asset_canon_selection_integrity.sql",
  ),
  "utf8",
);

const ids = {
  household1: "82000000-0000-4000-8000-000000000001",
  household2: "82000000-0000-4000-8000-000000000002",
  subject1: "82000000-0000-4000-8000-000000000003",
  subject2: "82000000-0000-4000-8000-000000000004",
  asset: "82000000-0000-4000-8000-000000000005",
  dirtyCanon: "82000000-0000-4000-8000-000000000006",
  validCanon: "82000000-0000-4000-8000-000000000007",
  wrongHouseholdCanon: "82000000-0000-4000-8000-000000000008",
  wrongSubjectCanon: "82000000-0000-4000-8000-000000000009",
  wrongKindCanon: "82000000-0000-4000-8000-000000000010",
  invalidSelectedCanon: "82000000-0000-4000-8000-000000000011",
};

const resetSchemaSql = `
  DROP SCHEMA IF EXISTS profile CASCADE;
  CREATE SCHEMA profile;

  CREATE TABLE profile.households (
    id uuid PRIMARY KEY
  );

  CREATE TABLE profile.managed_assets (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
    subject_type varchar(32) NOT NULL,
    subject_id uuid NOT NULL,
    asset_kind varchar(64) NOT NULL
  );

  CREATE TABLE profile.managed_asset_canons (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
    subject_type varchar(32) NOT NULL,
    subject_id uuid NOT NULL,
    asset_kind varchar(64) NOT NULL,
    selected_asset_id uuid REFERENCES profile.managed_assets(id) ON DELETE SET NULL,
    status varchar(32) NOT NULL DEFAULT 'draft',
    selected_at timestamptz
  );
`;

const client = new Client({ connectionString: databaseUrl });
await client.connect();

async function seedBase() {
  await client.query(resetSchemaSql);
  await client.query("INSERT INTO profile.households VALUES ($1), ($2)", [
    ids.household1,
    ids.household2,
  ]);
  await client.query(
    `INSERT INTO profile.managed_assets
      (id, household_id, subject_type, subject_id, asset_kind)
     VALUES ($1, $2, 'character', $3, 'character_portrait')`,
    [ids.asset, ids.household1, ids.subject1],
  );
}

try {
  // Legacy generic FK accepts a real asset id even when canon scope differs.
  await seedBase();
  await client.query(
    `INSERT INTO profile.managed_asset_canons
      (id, household_id, subject_type, subject_id, asset_kind, selected_asset_id, status, selected_at)
     VALUES ($1, $2, 'character', $3, 'character_portrait', $4, 'selected', now())`,
    [ids.dirtyCanon, ids.household2, ids.subject1, ids.asset],
  );

  await assert.rejects(
    client.query(migrationSql),
    /Managed asset canon selection scope mismatch: 1 invalid row\(s\)/,
  );

  // Clean generation-1-compatible state migrates and validates the new FK.
  await seedBase();
  await client.query(migrationSql);

  const constraint = await client.query(
    `SELECT convalidated
     FROM pg_constraint
     WHERE conname = 'managed_asset_canons_selected_asset_scope_fk'
       AND conrelid = 'profile.managed_asset_canons'::regclass`,
  );
  assert.equal(constraint.rowCount, 1);
  assert.equal(constraint.rows[0].convalidated, true);

  await client.query(
    `INSERT INTO profile.managed_asset_canons
      (id, household_id, subject_type, subject_id, asset_kind, selected_asset_id, status, selected_at)
     VALUES ($1, $2, 'character', $3, 'character_portrait', $4, 'selected', now())`,
    [ids.validCanon, ids.household1, ids.subject1, ids.asset],
  );

  await assert.rejects(
    client.query(
      `INSERT INTO profile.managed_asset_canons
        (id, household_id, subject_type, subject_id, asset_kind, selected_asset_id)
       VALUES ($1, $2, 'character', $3, 'character_portrait', $4)`,
      [ids.wrongHouseholdCanon, ids.household2, ids.subject1, ids.asset],
    ),
    /managed_asset_canons_selected_asset_scope_fk/,
  );

  await assert.rejects(
    client.query(
      `INSERT INTO profile.managed_asset_canons
        (id, household_id, subject_type, subject_id, asset_kind, selected_asset_id)
       VALUES ($1, $2, 'character', $3, 'character_portrait', $4)`,
      [ids.wrongSubjectCanon, ids.household1, ids.subject2, ids.asset],
    ),
    /managed_asset_canons_selected_asset_scope_fk/,
  );

  await assert.rejects(
    client.query(
      `INSERT INTO profile.managed_asset_canons
        (id, household_id, subject_type, subject_id, asset_kind, selected_asset_id)
       VALUES ($1, $2, 'character', $3, 'story_illustration', $4)`,
      [ids.wrongKindCanon, ids.household1, ids.subject1, ids.asset],
    ),
    /managed_asset_canons_selected_asset_scope_fk/,
  );

  // SQL/alternate writers cannot advertise selected state without a pointer.
  await assert.rejects(
    client.query(
      `INSERT INTO profile.managed_asset_canons
        (id, household_id, subject_type, subject_id, asset_kind, selected_asset_id, status, selected_at)
       VALUES ($1, $2, 'character', $3, 'character_portrait', NULL, 'selected', now())`,
      [ids.invalidSelectedCanon, ids.household1, ids.subject1],
    ),
    /managed_asset_canons_selected_requires_asset/,
  );

  // Physical deletion clears only the pointer identity columns at FK level,
  // while the trigger normalizes the active canon state in the same UPDATE.
  await client.query("DELETE FROM profile.managed_assets WHERE id = $1", [
    ids.asset,
  ]);
  const afterDelete = await client.query(
    `SELECT selected_asset_id, status, selected_at
     FROM profile.managed_asset_canons
     WHERE id = $1`,
    [ids.validCanon],
  );
  assert.equal(afterDelete.rows[0].selected_asset_id, null);
  assert.equal(afterDelete.rows[0].status, "draft");
  assert.equal(afterDelete.rows[0].selected_at, null);

  console.warn("Managed asset canon integrity database self-test OK");
} finally {
  await client.query("DROP SCHEMA IF EXISTS profile CASCADE").catch(() => {});
  await client.end();
}
