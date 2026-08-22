import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.LEGACY_CHARACTER_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("LEGACY_CHARACTER_TEST_DATABASE_URL is required");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const readMigration = (packageName, filename) =>
  readFile(
    resolve(__dirname, "..", "..", packageName, "migrations", filename),
    "utf8",
  );

const [splitAvatar, childSync, subtypeLock, splitNpc, registryContract] =
  await Promise.all([
    readMigration("profiles", "0079_child_avatar_identity_split.sql"),
    readMigration("profiles", "0080_child_avatar_registry_sync.sql"),
    readMigration("profiles", "0081_character_subtype_immutability.sql"),
    readMigration("world", "0012_world_npc_identity_split.sql"),
    readMigration("world", "0015_legacy_character_registry_contract.sql"),
  ]);

const ids = Array.from({ length: 12 }, (_, index) =>
  `60000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
const [
  household,
  child,
  world,
  avatar,
  npc,
  newNpc,
  newAvatar,
  secondWorld,
  ambiguousNpc,
  childWithoutWorld,
  unresolvedNpc,
  archivedWorld,
] = ids;

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query(
    "DROP SCHEMA IF EXISTS profile CASCADE; CREATE SCHEMA profile",
  );
  await client.query(`
    CREATE TABLE profile.households (
      id uuid PRIMARY KEY
    );
    CREATE TABLE profile.child_profiles (
      id uuid PRIMARY KEY,
      household_id uuid NOT NULL,
      UNIQUE (id, household_id)
    );
    CREATE TABLE profile.lumi_characters (
      id uuid PRIMARY KEY,
      child_profile_id uuid NOT NULL,
      household_id uuid NOT NULL,
      character_subtype varchar(20) NOT NULL,
      deleted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE profile.worlds (
      id uuid PRIMARY KEY,
      child_profile_id uuid NOT NULL,
      household_id uuid NOT NULL,
      lifecycle_status varchar(20) NOT NULL DEFAULT 'active'
    );
  `);

  await client.query("INSERT INTO profile.households VALUES ($1)", [household]);
  await client.query(
    "INSERT INTO profile.child_profiles (id, household_id) VALUES ($1, $2), ($3, $2)",
    [child, household, childWithoutWorld],
  );
  await client.query(
    "INSERT INTO profile.worlds (id, child_profile_id, household_id, lifecycle_status) VALUES ($1, $2, $3, 'active')",
    [world, child, household],
  );
  await client.query(
    `INSERT INTO profile.lumi_characters
      (id, child_profile_id, household_id, character_subtype)
     VALUES ($1, $2, $3, 'child_avatar'), ($4, $2, $3, 'npc')`,
    [avatar, child, household, npc],
  );

  await client.query(splitAvatar);
  await client.query(childSync);
  await client.query(subtypeLock);
  await client.query(splitNpc);
  await client.query(registryContract);

  const initialRegistry = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM profile.child_avatars) AS avatars,
       (SELECT COUNT(*)::int FROM profile.world_npcs) AS npcs`,
  );
  assert.deepEqual(initialRegistry.rows, [{ avatars: 1, npcs: 1 }]);

  await client.query(
    `INSERT INTO profile.lumi_characters
      (id, child_profile_id, household_id, character_subtype)
     VALUES ($1, $2, $3, 'npc')`,
    [newNpc, child, household],
  );
  const npcRow = await client.query(
    "SELECT world_id FROM profile.world_npcs WHERE character_id = $1",
    [newNpc],
  );
  assert.deepEqual(npcRow.rows, [{ world_id: world }]);

  await client.query(
    `INSERT INTO profile.lumi_characters
      (id, child_profile_id, household_id, character_subtype)
     VALUES ($1, $2, $3, 'child_avatar')`,
    [newAvatar, childWithoutWorld, household],
  );
  const avatarRow = await client.query(
    "SELECT character_id FROM profile.child_avatars WHERE character_id = $1",
    [newAvatar],
  );
  assert.equal(avatarRow.rowCount, 1);

  await client.query(
    "UPDATE profile.lumi_characters SET deleted_at = now() WHERE id = $1",
    [newNpc],
  );
  const propagatedDelete = await client.query(
    "SELECT deleted_at IS NOT NULL AS deleted FROM profile.world_npcs WHERE character_id = $1",
    [newNpc],
  );
  assert.deepEqual(propagatedDelete.rows, [{ deleted: true }]);

  await assert.rejects(
    client.query(
      "UPDATE profile.lumi_characters SET character_subtype = 'npc' WHERE id = $1",
      [avatar],
    ),
    /Character subtype is immutable after creation/,
  );

  await client.query(
    "INSERT INTO profile.worlds (id, child_profile_id, household_id, lifecycle_status) VALUES ($1, $2, $3, 'active')",
    [secondWorld, child, household],
  );
  await assert.rejects(
    client.query(
      `INSERT INTO profile.lumi_characters
        (id, child_profile_id, household_id, character_subtype)
       VALUES ($1, $2, $3, 'npc')`,
      [ambiguousNpc, child, household],
    ),
    /requires exactly one non-archived world.*found 2/,
  );
  await client.query("DELETE FROM profile.worlds WHERE id = $1", [secondWorld]);

  await assert.rejects(
    client.query(
      `INSERT INTO profile.lumi_characters
        (id, child_profile_id, household_id, character_subtype)
       VALUES ($1, $2, $3, 'npc')`,
      [unresolvedNpc, childWithoutWorld, household],
    ),
    /requires exactly one non-archived world.*found 0/,
  );

  await client.query(
    "INSERT INTO profile.worlds (id, child_profile_id, household_id, lifecycle_status) VALUES ($1, $2, $3, 'archived')",
    [archivedWorld, child, household],
  );

  const finalInvalid = await client.query(`
    SELECT COUNT(*)::int AS count
    FROM profile.lumi_characters AS character
    LEFT JOIN profile.child_avatars AS avatar_row
      ON avatar_row.character_id = character.id
    LEFT JOIN profile.world_npcs AS npc_row
      ON npc_row.character_id = character.id
    WHERE (character.character_subtype = 'child_avatar' AND avatar_row.character_id IS NULL)
       OR (character.character_subtype = 'npc' AND npc_row.character_id IS NULL)
  `);
  assert.deepEqual(finalInvalid.rows, [{ count: 0 }]);

  console.warn("Legacy character contract database self-test OK");
} finally {
  await client
    .query("DROP SCHEMA IF EXISTS profile CASCADE")
    .catch(() => undefined);
  await client.end();
}
