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
const migration = await readFile(
  resolve(
    __dirname,
    "..",
    "migrations",
    "0082_managed_asset_canon_scope_integrity.sql",
  ),
  "utf8",
);

function id(index) {
  return `82000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

const h1 = id(1);
const h2 = id(2);
const subject1 = id(3);
const subject2 = id(4);
const asset1 = id(5);
const asset2 = id(6);
const asset3 = id(7);
const canon1 = id(8);

const client = new Client({ connectionString: databaseUrl });
await client.connect();

async function reset() {
  await client.query("DROP SCHEMA IF EXISTS profile CASCADE");
  await client.query("CREATE SCHEMA profile");
  await client.query(`
    CREATE TABLE profile.households (id uuid PRIMARY KEY);
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
      status varchar(24) NOT NULL DEFAULT 'draft',
      version integer NOT NULL DEFAULT 1,
      selected_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (household_id, subject_type, subject_id, asset_kind)
    );
  `);
  await client.query("INSERT INTO profile.households VALUES ($1),($2)", [
    h1,
    h2,
  ]);
}

async function seedAssets() {
  await client.query(
    `INSERT INTO profile.managed_assets
      (id, household_id, subject_type, subject_id, asset_kind)
     VALUES
      ($1,$2,'character',$3,'portrait'),
      ($4,$5,'character',$3,'portrait'),
      ($6,$2,'character',$7,'header')`,
    [asset1, h1, subject1, asset2, h2, asset3, subject2],
  );
}

try {
  // Legacy cross-household pointer must stop the migration before constraints change.
  await reset();
  await seedAssets();
  await client.query(
    `INSERT INTO profile.managed_asset_canons
      (id, household_id, subject_type, subject_id, asset_kind, selected_asset_id, status)
     VALUES ($1,$2,'character',$3,'portrait',$4,'selected')`,
    [canon1, h1, subject1, asset2],
  );
  await assert.rejects(
    client.query(migration),
    /Managed asset canon scope mismatch: 1 invalid row\(s\)/,
  );

  // Legacy selected-without-pointer state must also fail closed.
  await reset();
  await seedAssets();
  await client.query(
    `INSERT INTO profile.managed_asset_canons
      (id, household_id, subject_type, subject_id, asset_kind, selected_asset_id, status)
     VALUES ($1,$2,'character',$3,'portrait',NULL,'selected')`,
    [canon1, h1, subject1],
  );
  await assert.rejects(
    client.query(migration),
    /Managed asset canon selected state mismatch: 1 invalid row\(s\)/,
  );

  // Clean legacy shape migrates and enforces all future writes.
  await reset();
  await seedAssets();
  await client.query(
    `INSERT INTO profile.managed_asset_canons
      (id, household_id, subject_type, subject_id, asset_kind, selected_asset_id, status, selected_at)
     VALUES ($1,$2,'character',$3,'portrait',$4,'selected',now())`,
    [canon1, h1, subject1, asset1],
  );
  await client.query(migration);

  await assert.rejects(
    client.query(
      "UPDATE profile.managed_asset_canons SET selected_asset_id = $1 WHERE id = $2",
      [asset2, canon1],
    ),
    /managed_asset_canons_selected_asset_scope_fk/,
  );
  await assert.rejects(
    client.query(
      "UPDATE profile.managed_asset_canons SET selected_asset_id = $1 WHERE id = $2",
      [asset3, canon1],
    ),
    /managed_asset_canons_selected_asset_scope_fk/,
  );
  await assert.rejects(
    client.query(
      "UPDATE profile.managed_asset_canons SET selected_asset_id = NULL WHERE id = $1",
      [canon1],
    ),
    /managed_asset_canons_selected_pointer_check/,
  );
  await assert.rejects(
    client.query("DELETE FROM profile.managed_assets WHERE id = $1", [asset1]),
    /managed_asset_canons_selected_asset_scope_fk/,
  );

  await client.query(
    `UPDATE profile.managed_asset_canons
     SET selected_asset_id = NULL, status = 'archived', selected_at = NULL
     WHERE id = $1`,
    [canon1],
  );
  await client.query("DELETE FROM profile.managed_assets WHERE id = $1", [
    asset1,
  ]);
  const { rows } = await client.query(
    "SELECT status, selected_asset_id FROM profile.managed_asset_canons WHERE id = $1",
    [canon1],
  );
  assert.equal(rows[0].status, "archived");
  assert.equal(rows[0].selected_asset_id, null);

  // Direct replay is idempotent.
  await client.query(migration);

  console.warn("Managed asset canon DB integrity self-test passed");
} finally {
  await client.end();
}
