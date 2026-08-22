import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.INVENTORY_INTEGRITY_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("INVENTORY_INTEGRITY_TEST_DATABASE_URL is required");

const __dirname = dirname(fileURLToPath(import.meta.url));
const migration = await readFile(
  resolve(__dirname, "..", "migrations", "0081_inventory_typed_ownership.sql"),
  "utf8",
);
const ids = Array.from({ length: 8 }, (_, i) =>
  `40000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
);
const [household, avatar, npc, ownAvatar, ownNpc, container, unknown, ownUnknown] = ids;
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("DROP SCHEMA IF EXISTS profile CASCADE; CREATE SCHEMA profile");
  await client.query(`
    CREATE TABLE profile.households (id uuid PRIMARY KEY);
    CREATE TABLE profile.child_avatars (character_id uuid PRIMARY KEY);
    CREATE TABLE profile.world_npcs (character_id uuid PRIMARY KEY);
    CREATE TABLE profile.inventory_ownerships (
      id uuid PRIMARY KEY, owner_type varchar(40) NOT NULL, owner_id uuid NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'active'
    );
    CREATE TABLE profile.inventory_inventories (
      id uuid PRIMARY KEY, owner_type varchar(40) NOT NULL, owner_id uuid NOT NULL,
      lifecycle_status varchar(20) NOT NULL DEFAULT 'active'
    );
  `);
  await client.query("INSERT INTO profile.households VALUES ($1)", [household]);
  await client.query("INSERT INTO profile.child_avatars VALUES ($1)", [avatar]);
  await client.query("INSERT INTO profile.world_npcs VALUES ($1)", [npc]);
  await client.query(
    "INSERT INTO profile.inventory_ownerships VALUES ($1,'character',$2,'active'),($3,'npc',$4,'active')",
    [ownAvatar, avatar, ownNpc, npc],
  );
  await client.query(
    "INSERT INTO profile.inventory_inventories VALUES ($1,'household',$2,'active')",
    [container, household],
  );
  await client.query(migration);
  const typed = await client.query("SELECT COUNT(*)::int AS count FROM profile.inventory_ownership_typed_owners");
  assert.equal(typed.rows[0].count, 2);
  await assert.rejects(
    client.query(
      "INSERT INTO profile.inventory_ownership_typed_owners (ownership_id,owner_type,owner_id,household_id) VALUES ($1,'character',$2,$2)",
      [ownAvatar, household],
    ),
    /duplicate key|check constraint|foreign key constraint/,
  );

  await client.query("DROP SCHEMA profile CASCADE; CREATE SCHEMA profile");
  await client.query(`
    CREATE TABLE profile.households (id uuid PRIMARY KEY);
    CREATE TABLE profile.child_avatars (character_id uuid PRIMARY KEY);
    CREATE TABLE profile.world_npcs (character_id uuid PRIMARY KEY);
    CREATE TABLE profile.inventory_ownerships (
      id uuid PRIMARY KEY, owner_type varchar(40) NOT NULL, owner_id uuid NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'active'
    );
    CREATE TABLE profile.inventory_inventories (
      id uuid PRIMARY KEY, owner_type varchar(40) NOT NULL, owner_id uuid NOT NULL,
      lifecycle_status varchar(20) NOT NULL DEFAULT 'active'
    );
  `);
  await client.query(
    "INSERT INTO profile.inventory_ownerships VALUES ($1,'character',$2,'active')",
    [ownUnknown, unknown],
  );
  await assert.rejects(client.query(migration), /unresolved typed owner/);
  console.warn("Inventory typed ownership database self-test OK");
} finally {
  await client.query("DROP SCHEMA IF EXISTS profile CASCADE").catch(() => {});
  await client.end();
}
