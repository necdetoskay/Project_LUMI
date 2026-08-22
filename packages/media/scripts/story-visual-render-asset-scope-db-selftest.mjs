import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.STORY_VISUAL_RENDER_ASSET_SCOPE_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("STORY_VISUAL_RENDER_ASSET_SCOPE_TEST_DATABASE_URL is required");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migration = await readFile(
  resolve(
    __dirname,
    "..",
    "migrations",
    "0006_story_visual_render_asset_scope_integrity.sql",
  ),
  "utf8",
);

function id(index) {
  return `85000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

const householdA = id(1);
const householdB = id(2);
const childA = id(3);
const childB = id(4);
const worldA = id(5);
const worldB = id(6);
const manifestA = id(7);
const assetSetA = id(8);
const assetA = id(9);
const assetWrongHousehold = id(10);
const assetWrongChild = id(11);
const assetWrongWorld = id(12);
const renderA = id(13);

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
      world_id uuid NOT NULL
    );

    CREATE TABLE media.story_visual_manifests (
      id uuid PRIMARY KEY
    );

    CREATE TABLE media.story_visual_asset_sets (
      id uuid PRIMARY KEY,
      manifest_id uuid NOT NULL REFERENCES media.story_visual_manifests(id) ON DELETE CASCADE,
      household_id uuid NOT NULL,
      child_profile_id uuid NOT NULL,
      world_id uuid NOT NULL
    );

    CREATE TABLE media.story_visual_asset_set_renders (
      id uuid PRIMARY KEY,
      asset_set_id uuid NOT NULL REFERENCES media.story_visual_asset_sets(id) ON DELETE CASCADE,
      asset_id uuid REFERENCES media.media_assets(id) ON DELETE SET NULL,
      status varchar(20) NOT NULL
    );
  `);
}

async function seedBase() {
  await client.query("INSERT INTO media.story_visual_manifests (id) VALUES ($1)", [
    manifestA,
  ]);
  await client.query(
    `INSERT INTO media.story_visual_asset_sets
      (id, manifest_id, household_id, child_profile_id, world_id)
     VALUES ($1,$2,$3,$4,$5)`,
    [assetSetA, manifestA, householdA, childA, worldA],
  );
  await client.query(
    `INSERT INTO media.media_assets (id, household_id, child_profile_id, world_id)
     VALUES
       ($1,$2,$3,$4),
       ($5,$6,$3,$4),
       ($7,$2,$8,$4),
       ($9,$2,$3,$10)`,
    [
      assetA,
      householdA,
      childA,
      worldA,
      assetWrongHousehold,
      householdB,
      assetWrongChild,
      childB,
      assetWrongWorld,
      worldB,
    ],
  );
}

async function expectMigrationFailure(pattern) {
  await assert.rejects(client.query(migration), pattern);
  await client.query("ROLLBACK");
}

try {
  await reset();
  await seedBase();
  await client.query(
    `INSERT INTO media.story_visual_asset_set_renders (id, asset_set_id, asset_id, status)
     VALUES ($1,$2,$3,'ready')`,
    [renderA, assetSetA, assetWrongHousehold],
  );
  await expectMigrationFailure(
    /Story visual render asset scope mismatch: 1 invalid row\(s\)/,
  );

  await reset();
  await seedBase();
  await client.query(
    `INSERT INTO media.story_visual_asset_set_renders (id, asset_set_id, asset_id, status)
     VALUES ($1,$2,NULL,'reused')`,
    [renderA, assetSetA],
  );
  await expectMigrationFailure(
    /Story visual render ready pointer mismatch: 1 invalid row\(s\)/,
  );

  await reset();
  await seedBase();
  await client.query(
    `INSERT INTO media.story_visual_asset_set_renders (id, asset_set_id, asset_id, status)
     VALUES ($1,$2,$3,'ready')`,
    [renderA, assetSetA, assetA],
  );
  await client.query(migration);

  for (const wrongAsset of [
    assetWrongHousehold,
    assetWrongChild,
    assetWrongWorld,
  ]) {
    await assert.rejects(
      client.query(
        "UPDATE media.story_visual_asset_set_renders SET asset_id = $1 WHERE id = $2",
        [wrongAsset, renderA],
      ),
      /Story visual render asset scope mismatch for render/,
    );
  }

  await assert.rejects(
    client.query(
      "UPDATE media.story_visual_asset_sets SET household_id = $1 WHERE id = $2",
      [householdB, assetSetA],
    ),
    /Story visual asset set scope update would invalidate render asset scope/,
  );
  await assert.rejects(
    client.query(
      "UPDATE media.media_assets SET world_id = $1 WHERE id = $2",
      [worldB, assetA],
    ),
    /Media asset scope update would invalidate Story visual render scope/,
  );
  await assert.rejects(
    client.query(
      "UPDATE media.story_visual_asset_set_renders SET asset_id = NULL WHERE id = $1",
      [renderA],
    ),
    /chk_story_visual_render_ready_asset/,
  );
  await assert.rejects(
    client.query("DELETE FROM media.media_assets WHERE id = $1", [assetA]),
    /story_visual_render_asset_fk/,
  );

  await client.query(
    `UPDATE media.story_visual_asset_set_renders
     SET status = 'missing', asset_id = NULL
     WHERE id = $1`,
    [renderA],
  );
  await client.query("DELETE FROM media.media_assets WHERE id = $1", [assetA]);

  await client.query(migration);

  console.warn("Story visual render asset scope database self-test OK");
} finally {
  await client.end();
}
