import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.CHARACTER_SPLIT_TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("CHARACTER_SPLIT_TEST_DATABASE_URL is required");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const avatarMigration = await readFile(
  resolve(
    __dirname,
    "..",
    "migrations",
    "0079_child_avatar_identity_split.sql",
  ),
  "utf8",
);
const npcMigration = await readFile(
  resolve(
    __dirname,
    "..",
    "..",
    "world",
    "migrations",
    "0012_world_npc_identity_split.sql",
  ),
  "utf8",
);

const household = "10000000-0000-4000-8000-000000000001";
const child = "10000000-0000-4000-8000-000000000002";
const avatar = "10000000-0000-4000-8000-000000000003";
const npc = "10000000-0000-4000-8000-000000000004";
const world = "10000000-0000-4000-8000-000000000005";
const world2 = "10000000-0000-4000-8000-000000000006";

const client = new Client({ connectionString: databaseUrl });

async function resetFixture({ secondWorld = false } = {}) {
  await client.query("DROP SCHEMA IF EXISTS profile CASCADE");
  await client.query("CREATE SCHEMA profile");
  await client.query("CREATE TABLE profile.households (id uuid PRIMARY KEY)");
  await client.query(`
    CREATE TABLE profile.child_profiles (
      id uuid PRIMARY KEY,
      household_id uuid NOT NULL,
      UNIQUE (id, household_id)
    )
  `);
  await client.query(`
    CREATE TABLE profile.lumi_characters (
      id uuid PRIMARY KEY,
      child_profile_id uuid NOT NULL,
      household_id uuid NOT NULL,
      character_subtype varchar(20) NOT NULL,
      deleted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE profile.worlds (
      id uuid PRIMARY KEY,
      child_profile_id uuid NOT NULL,
      household_id uuid NOT NULL
    )
  `);

  await client.query("INSERT INTO profile.households (id) VALUES ($1)", [
    household,
  ]);
  await client.query(
    "INSERT INTO profile.child_profiles (id, household_id) VALUES ($1, $2)",
    [child, household],
  );
  await client.query(
    `INSERT INTO profile.lumi_characters
      (id, child_profile_id, household_id, character_subtype)
     VALUES ($1, $2, $3, 'child_avatar'), ($4, $2, $3, 'npc')`,
    [avatar, child, household, npc],
  );
  await client.query(
    "INSERT INTO profile.worlds (id, child_profile_id, household_id) VALUES ($1, $2, $3)",
    [world, child, household],
  );

  if (secondWorld) {
    await client.query(
      "INSERT INTO profile.worlds (id, child_profile_id, household_id) VALUES ($1, $2, $3)",
      [world2, child, household],
    );
  }
}

await client.connect();

try {
  await resetFixture();
  await client.query(avatarMigration);
  await client.query(npcMigration);

  const avatarRows = await client.query(
    "SELECT character_id, character_subtype FROM profile.child_avatars",
  );
  assert.deepEqual(avatarRows.rows, [
    { character_id: avatar, character_subtype: "child_avatar" },
  ]);

  const npcRows = await client.query(
    "SELECT character_id, character_subtype, world_id FROM profile.world_npcs",
  );
  assert.deepEqual(npcRows.rows, [
    { character_id: npc, character_subtype: "npc", world_id: world },
  ]);

  await assert.rejects(
    client.query(
      `INSERT INTO profile.child_avatars
        (character_id, character_subtype, child_profile_id, household_id)
       VALUES ($1, 'child_avatar', $2, $3)`,
      [npc, child, household],
    ),
    /foreign key constraint/,
  );

  await assert.rejects(
    client.query(
      `INSERT INTO profile.world_npcs
        (character_id, character_subtype, world_id, child_profile_id, household_id)
       VALUES ($1, 'npc', $2, $3, $4)`,
      [avatar, world, child, household],
    ),
    /foreign key constraint/,
  );

  await resetFixture({ secondWorld: true });
  await client.query(avatarMigration);
  await assert.rejects(
    client.query(npcMigration),
    /NPC split requires exactly one world per NPC scope/,
  );

  console.warn("Character identity split database self-test OK");
} finally {
  await client.query("DROP SCHEMA IF EXISTS profile CASCADE").catch(() => {});
  await client.end();
}
