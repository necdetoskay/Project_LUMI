import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.INVENTORY_INTEGRITY_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("INVENTORY_INTEGRITY_TEST_DATABASE_URL is required");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const worldMigrationDir = resolve(__dirname, "..", "..", "world", "migrations");
const typedOwnershipMigration = await readFile(
  resolve(worldMigrationDir, "0014_inventory_typed_ownership.sql"),
  "utf8",
);
const ownerReferenceMigration = await readFile(
  resolve(worldMigrationDir, "0017_inventory_owner_reference_integrity.sql"),
  "utf8",
);
const currentCompanionMigration = await readFile(
  resolve(
    worldMigrationDir,
    "0018_inventory_current_owner_companion_write_through.sql",
  ),
  "utf8",
);

function fixtureId(index) {
  const suffix = String(index + 1).padStart(12, "0");
  return `40000000-0000-4000-8000-${suffix}`;
}

const ids = Array.from({ length: 24 }, (_, index) => fixtureId(index));
const [
  householdA,
  householdB,
  avatarA,
  avatarB,
  npcA,
  itemA,
  itemB,
  itemA2,
  ownershipA,
  containerA,
  historyA,
  transferA,
  usageA,
  futureOwnership,
  futureContainer,
  futureUsage,
  unknownOwner,
  invalidOwnership,
  invalidContainer,
  invalidHistory,
  invalidTransfer,
  invalidUsage,
  cleanupUsage,
  legacyUnknownOwnership,
] = ids;

const resetSchemaSql = `
  DROP SCHEMA IF EXISTS profile CASCADE;
  CREATE SCHEMA profile;
`;

const fixtureSchemaSql = `
  CREATE TABLE profile.households (
    id uuid PRIMARY KEY
  );

  CREATE TABLE profile.child_avatars (
    character_id uuid PRIMARY KEY,
    household_id uuid NOT NULL
  );

  CREATE TABLE profile.world_npcs (
    character_id uuid PRIMARY KEY,
    household_id uuid NOT NULL
  );

  CREATE TABLE profile.inventory_item_instances (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL
  );

  CREATE TABLE profile.inventory_ownerships (
    id uuid PRIMARY KEY,
    item_instance_id uuid NOT NULL,
    owner_type varchar(40) NOT NULL,
    owner_id uuid NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'active'
  );

  CREATE TABLE profile.inventory_inventories (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL,
    owner_type varchar(40) NOT NULL,
    owner_id uuid NOT NULL,
    lifecycle_status varchar(20) NOT NULL DEFAULT 'active'
  );

  CREATE TABLE profile.inventory_ownership_history (
    id uuid PRIMARY KEY,
    item_instance_id uuid NOT NULL,
    from_owner_type varchar(40),
    from_owner_id uuid,
    to_owner_type varchar(40) NOT NULL,
    to_owner_id uuid NOT NULL,
    actor_household_id uuid NOT NULL
  );

  CREATE TABLE profile.inventory_transfers (
    id uuid PRIMARY KEY,
    item_instance_id uuid NOT NULL,
    from_owner_type varchar(40) NOT NULL,
    from_owner_id uuid NOT NULL,
    to_owner_type varchar(40) NOT NULL,
    to_owner_id uuid NOT NULL,
    actor_household_id uuid NOT NULL
  );

  CREATE TABLE profile.inventory_usages (
    id uuid PRIMARY KEY,
    item_instance_id uuid NOT NULL,
    used_by_owner_type varchar(40) NOT NULL,
    used_by_owner_id uuid NOT NULL,
    actor_household_id uuid NOT NULL
  );
`;

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  // Preserve the original PR-7 fail-closed regression: an active polymorphic
  // owner that cannot resolve to a typed identity must prevent migration.
  await client.query(resetSchemaSql);
  await client.query(fixtureSchemaSql);
  await client.query(
    "INSERT INTO profile.inventory_item_instances VALUES ($1,$2)",
    [itemA, householdA],
  );
  await client.query(
    "INSERT INTO profile.inventory_ownerships VALUES ($1,$2,'character',$3,'active')",
    [legacyUnknownOwnership, itemA, unknownOwner],
  );
  await assert.rejects(
    client.query(typedOwnershipMigration),
    /unresolved typed owner|inventory_ownership_one_typed_owner_check/,
  );

  // Rebuild a valid pre-hardening shape containing all owner-reference kinds.
  await client.query(resetSchemaSql);
  await client.query(fixtureSchemaSql);
  await client.query("INSERT INTO profile.households VALUES ($1),($2)", [
    householdA,
    householdB,
  ]);
  await client.query(
    "INSERT INTO profile.child_avatars VALUES ($1,$2),($3,$4)",
    [avatarA, householdA, avatarB, householdB],
  );
  await client.query("INSERT INTO profile.world_npcs VALUES ($1,$2)", [
    npcA,
    householdA,
  ]);
  await client.query(
    "INSERT INTO profile.inventory_item_instances VALUES ($1,$2),($3,$4),($5,$6)",
    [itemA, householdA, itemB, householdB, itemA2, householdA],
  );
  await client.query(
    "INSERT INTO profile.inventory_ownerships VALUES ($1,$2,'character',$3,'active')",
    [ownershipA, itemA, avatarA],
  );
  await client.query(
    "INSERT INTO profile.inventory_inventories VALUES ($1,$2,'household',$2,'active')",
    [containerA, householdA],
  );
  await client.query(
    `INSERT INTO profile.inventory_ownership_history
      VALUES ($1,$2,'character',$3,'character',$4,$5)`,
    [historyA, itemA, avatarA, npcA, householdA],
  );
  await client.query(
    `INSERT INTO profile.inventory_transfers
      VALUES ($1,$2,'npc',$3,'household',$4,$4)`,
    [transferA, itemA, npcA, householdA],
  );
  await client.query(
    `INSERT INTO profile.inventory_usages
      VALUES ($1,$2,'character',$3,$4)`,
    [usageA, itemA, avatarA, householdA],
  );

  await client.query(typedOwnershipMigration);
  await client.query(ownerReferenceMigration);
  await client.query(currentCompanionMigration);

  const typedReferenceCount = await client.query(
    "SELECT COUNT(*)::int AS count FROM profile.inventory_typed_owner_references",
  );
  assert.equal(typedReferenceCount.rows[0].count, 7);

  const ownershipReference = await client.query(
    `SELECT child_avatar_id, npc_id, household_id, scope_household_id
       FROM profile.inventory_typed_owner_references
      WHERE reference_kind = 'ownership' AND reference_id = $1`,
    [ownershipA],
  );
  assert.equal(ownershipReference.rows[0].child_avatar_id, avatarA);
  assert.equal(ownershipReference.rows[0].npc_id, null);
  assert.equal(ownershipReference.rows[0].household_id, null);
  assert.equal(ownershipReference.rows[0].scope_household_id, householdA);

  const historyToReference = await client.query(
    `SELECT npc_id
       FROM profile.inventory_typed_owner_references
      WHERE reference_kind = 'ownership_history_to' AND reference_id = $1`,
    [historyA],
  );
  assert.equal(historyToReference.rows[0].npc_id, npcA);

  // Future current ownership writes can no longer bypass typed identity, and
  // the original PR-7 companion remains synchronized.
  await client.query(
    "INSERT INTO profile.inventory_ownerships VALUES ($1,$2,'character',$3,'active')",
    [futureOwnership, itemA2, npcA],
  );
  const futureOwnershipReference = await client.query(
    `SELECT npc_id
       FROM profile.inventory_typed_owner_references
      WHERE reference_kind = 'ownership' AND reference_id = $1`,
    [futureOwnership],
  );
  assert.equal(futureOwnershipReference.rows[0].npc_id, npcA);
  const futureOwnershipCompanion = await client.query(
    `SELECT npc_id
       FROM profile.inventory_ownership_typed_owners
      WHERE ownership_id = $1`,
    [futureOwnership],
  );
  assert.equal(futureOwnershipCompanion.rows[0].npc_id, npcA);

  // Future container and usage writes are synchronized in the same transaction.
  await client.query(
    "INSERT INTO profile.inventory_inventories VALUES ($1,$2,'child_avatar',$3,'active')",
    [futureContainer, householdA, avatarA],
  );
  const futureContainerCompanion = await client.query(
    `SELECT child_avatar_id
       FROM profile.inventory_container_typed_owners
      WHERE inventory_id = $1`,
    [futureContainer],
  );
  assert.equal(futureContainerCompanion.rows[0].child_avatar_id, avatarA);
  await client.query(
    `INSERT INTO profile.inventory_usages
      VALUES ($1,$2,'household',$3,$3)`,
    [futureUsage, itemA, householdA],
  );

  // Cross-household and wrong-subtype identities fail closed.
  await assert.rejects(
    client.query(
      "INSERT INTO profile.inventory_ownerships VALUES ($1,$2,'npc',$3,'active')",
      [invalidOwnership, itemB, npcA],
    ),
    /0 typed owner match|foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO profile.inventory_inventories VALUES ($1,$2,'character',$3,'active')",
      [invalidContainer, householdB, avatarA],
    ),
    /0 typed owner match|foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      `INSERT INTO profile.inventory_usages
        VALUES ($1,$2,'npc',$3,$4)`,
      [invalidUsage, itemA, avatarA, householdA],
    ),
    /0 typed owner match|foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      `INSERT INTO profile.inventory_transfers
        VALUES ($1,$2,'character',$3,'household',$4,$5)`,
      [invalidTransfer, itemA, avatarA, householdB, householdB],
    ),
    /0 typed owner match|foreign key constraint/,
  );

  // Unknown UUIDs and half-populated nullable history-from references are rejected.
  await assert.rejects(
    client.query(
      `INSERT INTO profile.inventory_usages
        VALUES ($1,$2,'character',$3,$4)`,
      [cleanupUsage, itemA, unknownOwner, householdA],
    ),
    /0 typed owner match|foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      `INSERT INTO profile.inventory_ownership_history
        VALUES ($1,$2,'character',NULL,'character',$3,$4)`,
      [invalidHistory, itemA, avatarA, householdA],
    ),
    /requires from_owner_type\/from_owner_id together/,
  );

  // A nullable from-owner is valid only when both legacy fields are null.
  await client.query(
    `INSERT INTO profile.inventory_ownership_history
      VALUES ($1,$2,NULL,NULL,'child_avatar',$3,$4)`,
    [invalidHistory, itemA, avatarA, householdA],
  );
  const nullableFromRefs = await client.query(
    `SELECT reference_kind
       FROM profile.inventory_typed_owner_references
      WHERE reference_id = $1
      ORDER BY reference_kind`,
    [invalidHistory],
  );
  assert.deepEqual(
    nullableFromRefs.rows.map((row) => row.reference_kind),
    ["ownership_history_to"],
  );

  // Delete cleanup prevents generic typed-reference orphans.
  await client.query(
    `INSERT INTO profile.inventory_usages
      VALUES ($1,$2,'child_avatar',$3,$4)`,
    [cleanupUsage, itemA, avatarA, householdA],
  );
  await client.query("DELETE FROM profile.inventory_usages WHERE id = $1", [
    cleanupUsage,
  ]);
  const deletedReference = await client.query(
    `SELECT COUNT(*)::int AS count
       FROM profile.inventory_typed_owner_references
      WHERE reference_kind = 'usage' AND reference_id = $1`,
    [cleanupUsage],
  );
  assert.equal(deletedReference.rows[0].count, 0);

  // Both forward-only migrations remain safe if replayed directly.
  await client.query(ownerReferenceMigration);
  await client.query(currentCompanionMigration);
  const replayedReferenceCount = await client.query(
    "SELECT COUNT(*)::int AS count FROM profile.inventory_typed_owner_references",
  );
  assert.equal(replayedReferenceCount.rows[0].count, 11);

  console.warn("Inventory typed owner reference database self-test OK");
} finally {
  await client.query(resetSchemaSql).catch(() => {});
  await client.end();
}
