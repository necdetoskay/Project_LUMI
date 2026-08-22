import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.MEDIA_FINGERPRINT_CACHE_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("MEDIA_FINGERPRINT_CACHE_TEST_DATABASE_URL is required");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migration = await readFile(
  resolve(
    __dirname,
    "..",
    "migrations",
    "0004_fingerprint_cache_asset_scope_integrity.sql",
  ),
  "utf8",
);

function id(index) {
  return `83000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

const householdA = id(1);
const householdB = id(2);
const childA = id(3);
const childB = id(4);
const worldA = id(5);
const worldB = id(6);
const assetA = id(7);
const cacheA = id(8);

const fingerprintA = "a".repeat(64);
const fingerprintB = "b".repeat(64);

const client = new Client({ connectionString: databaseUrl });
await client.connect();

async function reset() {
  await client.query("DROP SCHEMA IF EXISTS media CASCADE");
  await client.query("CREATE SCHEMA media");
  await client.query(`
    CREATE TABLE media.media_assets (
      id uuid PRIMARY KEY,
      household_id uuid NOT NULL,
      child_profile_id uuid NOT NULL,
      world_id uuid NOT NULL,
      fingerprint varchar(64) NOT NULL
    );

    CREATE TABLE media.media_fingerprint_cache (
      id uuid PRIMARY KEY,
      fingerprint varchar(64) NOT NULL,
      household_id uuid NOT NULL,
      child_profile_id uuid NOT NULL,
      world_id uuid NOT NULL,
      asset_id uuid NOT NULL REFERENCES media.media_assets(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function seedAsset() {
  await client.query(
    `INSERT INTO media.media_assets
      (id, household_id, child_profile_id, world_id, fingerprint)
     VALUES ($1,$2,$3,$4,$5)`,
    [assetA, householdA, childA, worldA, fingerprintA],
  );
}

async function insertCache({
  householdId = householdA,
  childProfileId = childA,
  worldId = worldA,
  fingerprint = fingerprintA,
} = {}) {
  await client.query(
    `INSERT INTO media.media_fingerprint_cache
      (id, fingerprint, household_id, child_profile_id, world_id, asset_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [cacheA, fingerprint, householdId, childProfileId, worldId, assetA],
  );
}

try {
  // Legacy rows with duplicated scope drift must stop the migration before DDL.
  for (const invalidScope of [
    { householdId: householdB },
    { childProfileId: childB },
    { worldId: worldB },
    { fingerprint: fingerprintB },
  ]) {
    await reset();
    await seedAsset();
    await insertCache(invalidScope);
    await assert.rejects(
      client.query(migration),
      /Media fingerprint cache asset scope mismatch: 1 invalid row\(s\)/,
    );
  }

  // A valid legacy row migrates and the composite identity becomes authoritative.
  await reset();
  await seedAsset();
  await insertCache();
  await client.query(migration);

  await assert.rejects(
    client.query(
      "UPDATE media.media_fingerprint_cache SET household_id = $1 WHERE id = $2",
      [householdB, cacheA],
    ),
    /media_fingerprint_cache_asset_scope_fk/,
  );
  await assert.rejects(
    client.query(
      "UPDATE media.media_fingerprint_cache SET child_profile_id = $1 WHERE id = $2",
      [childB, cacheA],
    ),
    /media_fingerprint_cache_asset_scope_fk/,
  );
  await assert.rejects(
    client.query(
      "UPDATE media.media_fingerprint_cache SET world_id = $1 WHERE id = $2",
      [worldB, cacheA],
    ),
    /media_fingerprint_cache_asset_scope_fk/,
  );
  await assert.rejects(
    client.query(
      "UPDATE media.media_fingerprint_cache SET fingerprint = $1 WHERE id = $2",
      [fingerprintB, cacheA],
    ),
    /media_fingerprint_cache_asset_scope_fk/,
  );

  // Asset deletion still cascades to its cache row.
  await client.query("DELETE FROM media.media_assets WHERE id = $1", [assetA]);
  const { rows } = await client.query(
    "SELECT COUNT(*)::int AS count FROM media.media_fingerprint_cache WHERE id = $1",
    [cacheA],
  );
  assert.equal(rows[0].count, 0);

  // Direct migration replay is idempotent.
  await client.query(migration);

  console.warn("Media fingerprint cache database self-test OK");
} finally {
  await client.end();
}
