import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.STORY_VISUAL_ASSET_SET_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("STORY_VISUAL_ASSET_SET_TEST_DATABASE_URL is required");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migration = await readFile(
  resolve(
    __dirname,
    "..",
    "migrations",
    "0005_story_visual_asset_set_manifest_integrity.sql",
  ),
  "utf8",
);

function id(index) {
  return `84000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

const householdA = id(1);
const householdB = id(2);
const childA = id(3);
const childB = id(4);
const worldA = id(5);
const worldB = id(6);
const storyA = id(7);
const storyB = id(8);
const manifestA = id(9);
const assetSetA = id(10);
const assetSetB = id(11);

const fingerprintA = "a".repeat(64);
const fingerprintB = "b".repeat(64);

const client = new Client({ connectionString: databaseUrl });
await client.connect();

async function reset() {
  await client.query("DROP SCHEMA IF EXISTS media CASCADE");
  await client.query("CREATE SCHEMA media");
  await client.query(`
    CREATE FUNCTION media.__media_constraint_exists(p_constraint_name text)
    RETURNS boolean
    LANGUAGE sql
    AS $$
      SELECT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'media'
          AND c.conname = p_constraint_name
      )
    $$;

    CREATE TABLE media.story_visual_manifests (
      id uuid PRIMARY KEY,
      household_id uuid NOT NULL,
      child_profile_id uuid NOT NULL,
      world_id uuid NOT NULL,
      story_id uuid NOT NULL,
      manifest_fingerprint varchar(64) NOT NULL
    );

    CREATE TABLE media.story_visual_asset_sets (
      id uuid PRIMARY KEY,
      manifest_id uuid NOT NULL REFERENCES media.story_visual_manifests(id) ON DELETE CASCADE,
      household_id uuid NOT NULL,
      child_profile_id uuid NOT NULL,
      world_id uuid NOT NULL,
      story_id uuid NOT NULL,
      manifest_fingerprint varchar(64) NOT NULL,
      active boolean NOT NULL DEFAULT false
    );

    CREATE UNIQUE INDEX uq_story_visual_active_asset_set
      ON media.story_visual_asset_sets (household_id, story_id)
      WHERE active = true;
  `);
}

async function seedManifest() {
  await client.query(
    `INSERT INTO media.story_visual_manifests
      (id, household_id, child_profile_id, world_id, story_id, manifest_fingerprint)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [manifestA, householdA, childA, worldA, storyA, fingerprintA],
  );
}

async function insertAssetSet({
  id: rowId = assetSetA,
  householdId = householdA,
  childProfileId = childA,
  worldId = worldA,
  storyId = storyA,
  manifestFingerprint = fingerprintA,
  active = false,
} = {}) {
  await client.query(
    `INSERT INTO media.story_visual_asset_sets
      (id, manifest_id, household_id, child_profile_id, world_id, story_id, manifest_fingerprint, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      rowId,
      manifestA,
      householdId,
      childProfileId,
      worldId,
      storyId,
      manifestFingerprint,
      active,
    ],
  );
}

async function expectMigrationRejected(pattern) {
  try {
    await assert.rejects(client.query(migration), pattern);
  } finally {
    // The migration owns an explicit transaction. An expected preflight failure
    // leaves that transaction aborted, so restore the session before the next
    // isolated legacy-data scenario.
    await client.query("ROLLBACK");
  }
}

try {
  for (const invalidIdentity of [
    { householdId: householdB },
    { childProfileId: childB },
    { worldId: worldB },
    { storyId: storyB },
    { manifestFingerprint: fingerprintB },
  ]) {
    await reset();
    await seedManifest();
    await insertAssetSet(invalidIdentity);
    await expectMigrationRejected(
      /Story visual asset set manifest identity mismatch: 1 invalid row\(s\)/,
    );
  }

  await reset();
  await seedManifest();
  await insertAssetSet({ active: true });
  await client.query(migration);

  for (const [column, value] of [
    ["household_id", householdB],
    ["child_profile_id", childB],
    ["world_id", worldB],
    ["story_id", storyB],
    ["manifest_fingerprint", fingerprintB],
  ]) {
    await assert.rejects(
      client.query(
        `UPDATE media.story_visual_asset_sets SET ${column} = $1 WHERE id = $2`,
        [value, assetSetA],
      ),
      /story_visual_asset_sets_manifest_identity_fk/,
    );
  }

  // The pre-existing active-set invariant remains authoritative.
  await assert.rejects(
    insertAssetSet({ id: assetSetB, active: true }),
    /uq_story_visual_active_asset_set/,
  );

  // Manifest deletion still cascades through the strengthened identity FK.
  await client.query("DELETE FROM media.story_visual_manifests WHERE id = $1", [
    manifestA,
  ]);
  const { rows } = await client.query(
    "SELECT COUNT(*)::int AS count FROM media.story_visual_asset_sets WHERE id = $1",
    [assetSetA],
  );
  assert.equal(rows[0].count, 0);

  // Direct migration replay is idempotent.
  await client.query(migration);

  console.warn("Story visual asset set manifest database self-test OK");
} finally {
  await client.end();
}
