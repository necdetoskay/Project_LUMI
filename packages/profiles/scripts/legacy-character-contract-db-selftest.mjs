import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.LEGACY_CHARACTER_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("LEGACY_CHARACTER_TEST_DATABASE_URL is required");
const __dirname = dirname(fileURLToPath(import.meta.url));
const splitAvatar = await readFile(
  resolve(
    __dirname,
    "..",
    "migrations",
    "0079_child_avatar_identity_split.sql",
  ),
  "utf8",
);
const splitNpc = await readFile(
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
const contract = await readFile(
  resolve(__dirname, "..", "migrations", "0082_legacy_character_contract.sql"),
  "utf8",
);
const ids = Array.from({ length: 7 }, (_, i) =>
  `60000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
);
const [household, child, avatar, npc, world, newNpc, newAvatar] = ids;
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(
    "DROP SCHEMA IF EXISTS profile CASCADE; CREATE SCHEMA profile",
  );
  await client.query(`
    CREATE TABLE profile.households (id uuid PRIMARY KEY);
    CREATE TABLE profile.child_profiles (id uuid PRIMARY KEY, household_id uuid NOT NULL, UNIQUE(id,household_id));
    CREATE TABLE profile.lumi_characters (
      id uuid PRIMARY KEY, child_profile_id uuid NOT NULL, household_id uuid NOT NULL,
      character_subtype varchar(20) NOT NULL, deleted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE profile.worlds (
      id uuid PRIMARY KEY, child_profile_id uuid NOT NULL, household_id uuid NOT NULL,
      lifecycle_status varchar(20) NOT NULL DEFAULT 'active'
    );
  `);
  await client.query("INSERT INTO profile.households VALUES ($1)", [household]);
  await client.query("INSERT INTO profile.child_profiles VALUES ($1,$2)", [
    child,
    household,
  ]);
  await client.query(
    "INSERT INTO profile.worlds VALUES ($1,$2,$3,'active')",
    [world, child, household],
  );
  await client.query(
    "INSERT INTO profile.lumi_characters (id,child_profile_id,household_id,character_subtype) VALUES ($1,$2,$3,'child_avatar'),($4,$2,$3,'npc')",
    [avatar, child, household, npc],
  );
  await client.query(splitAvatar);
  await client.query(splitNpc);
  await client.query(contract);

  await client.query(
    "INSERT INTO profile.lumi_characters (id,child_profile_id,household_id,character_subtype) VALUES ($1,$2,$3,'npc')",
    [newNpc, child, household],
  );
  const npcRow = await client.query(
    "SELECT world_id FROM profile.world_npcs WHERE character_id=$1",
    [newNpc],
  );
  assert.deepEqual(npcRow.rows, [{ world_id: world }]);

  await client.query(
    "INSERT INTO profile.lumi_characters (id,child_profile_id,household_id,character_subtype) VALUES ($1,$2,$3,'child_avatar')",
    [newAvatar, child, household],
  );
  const avatarRow = await client.query(
    "SELECT character_id FROM profile.child_avatars WHERE character_id=$1",
    [newAvatar],
  );
  assert.equal(avatarRow.rowCount, 1);

  await assert.rejects(
    client.query(
      "UPDATE profile.lumi_characters SET character_subtype='npc' WHERE id=$1",
      [avatar],
    ),
    /Character subtype is immutable/,
  );
  console.warn("Legacy character contract database self-test OK");
} finally {
  await client
    .query("DROP SCHEMA IF EXISTS profile CASCADE")
    .catch(() => {});
  await client.end();
}
