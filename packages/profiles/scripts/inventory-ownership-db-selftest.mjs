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
const stateActivationMigration = await readFile(
  resolve(worldMigrationDir, "0019_inventory_owner_state_activation_guard.sql"),
  "utf8",
);

function fixtureId(index) {
  const suffix = String(index + 1).padStart(12, "0");
  return `40000000-0000-4000-8000-${suffix}`;
}

const ids = Array.from({ length: 40 }, (_, index) => fixtureId(index));
const [
  householdA,
  householdB,
  childProfileA,
  childProfileB,
  avatarA,
  avatarB,
  npcA,
  worldA,
  worldB,
  locationA,
  locationB,
  itemA,
  itemB,
  itemA2,
  itemA3,
  itemA4,
  ownershipA,
  containerA,
  historyA,
  transferA,
  usageA,
  post0014ChildProfileOwnership,
  post0014LocationContainer,
  legacyReleasedOwnership,
  futureCharacterOwnership,
  futureChildProfileContainer,
  futureLocationUsage,
  unknownOwner,
  invalidOwnership,
  invalidContainer,
  invalidHistory,
  invalidTransfer,
  invalidUsage,
  invalidLocationUsage,
  invalidItemScopeUsage,
  cleanupUsage,
  legacyUnknownOwnership,
  nullableHistory,
] = ids;

const resetSchemaSql = `
  DROP SCHEMA IF EXISTS profile CASCADE;
  CREATE SCHEMA profile;
`;

const fixtureSchemaSql = `
  CREATE TABLE profile.households (
    id uuid PRIMARY KEY
  );

  CREATE TABLE profile.child_profiles (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL
  );

  CREATE TABLE profile.child_avatars (
    character_id uuid PRIMARY KEY,
    household_id uuid NOT NULL
  );

  CREATE TABLE profile.world_npcs (
    character_id uuid PRIMARY KEY,
    household_id uuid NOT NULL
  );

  CREATE TABLE profile.worlds (
    id uuid PRIMARY KEY,
    household_id uuid NOT NULL
  );

  CREATE TABLE profile.world_locations (
    id uuid PRIMARY KEY,
    world_id uuid NOT NULL
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

  // Rebuild a valid pre-hardening shape containing every canonical owner
  // family and every remaining polymorphic owner-reference table.
  await client.query(resetSchemaSql);
  await client.query(fixtureSchemaSql);
  await client.query("INSERT INTO profile.households VALUES ($1),($2)", [
    householdA,
    householdB,
  ]);
  await client.query(
    "INSERT INTO profile.child_profiles VALUES ($1,$2),($3,$4)",
    [childProfileA, householdA, childProfileB, householdB],
  );
  await client.query(
    "INSERT INTO profile.child_avatars VALUES ($1,$2),($3,$4)",
    [avatarA, householdA, avatarB, householdB],
  );
  await client.query("INSERT INTO profile.world_npcs VALUES ($1,$2)", [
    npcA,
    householdA,
  ]);
  await client.query("INSERT INTO profile.worlds VALUES ($1,$2),($3,$4)", [
    worldA,
    householdA,
    worldB,
    householdB,
  ]);
  await client.query(
    "INSERT INTO profile.world_locations VALUES ($1,$2),($3,$4)",
    [locationA, worldA, locationB, worldB],
  );
  await client.query(
    `INSERT INTO profile.inventory_item_instances
      VALUES ($1,$2),($3,$4),($5,$6),($7,$8),($9,$10)`,
    [
      itemA,
      householdA,
      itemB,
      householdB,
      itemA2,
      householdA,
      itemA3,
      householdA,
      itemA4,
      householdA,
    ],
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
      VALUES ($1,$2,'character',$3,'household',$4,$4)`,
    [transferA, itemA, npcA, householdA],
  );
  await client.query(
    `INSERT INTO profile.inventory_usages
      VALUES ($1,$2,'character',$3,$4)`,
    [usageA, itemA, avatarA, householdA],
  );

  // Reproduce the real upgrade shape: 0014 has already run in production, but
  // its lack of write-through enforcement allows canonical child_profile and
  // location current owners to be written afterwards without PR-7 companions.
  await client.query(typedOwnershipMigration);
  await client.query(
    "INSERT INTO profile.inventory_ownerships VALUES ($1,$2,'child_profile',$3,'active')",
    [post0014ChildProfileOwnership, itemA2, childProfileA],
  );
  await client.query(
    "INSERT INTO profile.inventory_inventories VALUES ($1,$2,'location',$3,'active')",
    [post0014LocationContainer, householdA, locationA],
  );
  await client.query(
    "INSERT INTO profile.inventory_ownerships VALUES ($1,$2,'location',$3,'released')",
    [legacyReleasedOwnership, itemA4, locationA],
  );

  await client.query(ownerReferenceMigration);
  await client.query(currentCompanionMigration);
  await client.query(stateActivationMigration);

  const typedReferenceCount = await client.query(
    "SELECT COUNT(*)::int AS count FROM profile.inventory_typed_owner_references",
  );
  assert.equal(typedReferenceCount.rows[0].count, 10);

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

  // 0018 must repair the two current owner types that 0014 could not represent.
  const childProfileCompanion = await client.query(
    `SELECT child_profile_id
       FROM profile.inventory_ownership_typed_owners
      WHERE ownership_id = $1`,
    [post0014ChildProfileOwnership],
  );
  assert.equal(childProfileCompanion.rows[0].child_profile_id, childProfileA);

  const locationCompanion = await client.query(
    `SELECT location_id
       FROM profile.inventory_container_typed_owners
      WHERE inventory_id = $1`,
    [post0014LocationContainer],
  );
  assert.equal(locationCompanion.rows[0].location_id, locationA);

  const locationCanonical = await client.query(
    `SELECT location_id, location_world_id, scope_household_id
       FROM profile.inventory_typed_owner_references
      WHERE reference_kind = 'inventory' AND reference_id = $1`,
    [post0014LocationContainer],
  );
  assert.equal(locationCanonical.rows[0].location_id, locationA);
  assert.equal(locationCanonical.rows[0].location_world_id, worldA);
  assert.equal(locationCanonical.rows[0].scope_household_id, householdA);

  // 0019 must backfill historical current-owner rows and status-only updates
  // must pass through canonical validation rather than bypassing it.
  const releasedCompanion = await client.query(
    `SELECT location_id
       FROM profile.inventory_ownership_typed_owners
      WHERE ownership_id = $1`,
    [legacyReleasedOwnership],
  );
  assert.equal(releasedCompanion.rows[0].location_id, locationA);
  await client.query(
    `DELETE FROM profile.inventory_typed_owner_references
      WHERE reference_kind = 'ownership' AND reference_id = $1`,
    [legacyReleasedOwnership],
  );
  await client.query(
    "UPDATE profile.inventory_ownerships SET status = 'active' WHERE id = $1",
    [legacyReleasedOwnership],
  );
  const reactivatedReference = await client.query(
    `SELECT location_id
       FROM profile.inventory_typed_owner_references
      WHERE reference_kind = 'ownership' AND reference_id = $1`,
    [legacyReleasedOwnership],
  );
  assert.equal(reactivatedReference.rows[0].location_id, locationA);

  // Future current ownership writes can no longer bypass typed identity, and
  // the original PR-7 companion remains synchronized.
  await client.query(
    "INSERT INTO profile.inventory_ownerships VALUES ($1,$2,'character',$3,'active')",
    [futureCharacterOwnership, itemA3, npcA],
  );
  const futureOwnershipReference = await client.query(
    `SELECT npc_id
       FROM profile.inventory_typed_owner_references
      WHERE reference_kind = 'ownership' AND reference_id = $1`,
    [futureCharacterOwnership],
  );
  assert.equal(futureOwnershipReference.rows[0].npc_id, npcA);
  const futureOwnershipCompanion = await client.query(
    `SELECT npc_id
       FROM profile.inventory_ownership_typed_owners
      WHERE ownership_id = $1`,
    [futureCharacterOwnership],
  );
  assert.equal(futureOwnershipCompanion.rows[0].npc_id, npcA);

  await client.query(
    "INSERT INTO profile.inventory_inventories VALUES ($1,$2,'child_profile',$3,'active')",
    [futureChildProfileContainer, householdA, childProfileA],
  );
  const futureChildProfileCompanion = await client.query(
    `SELECT child_profile_id
       FROM profile.inventory_container_typed_owners
      WHERE inventory_id = $1`,
    [futureChildProfileContainer],
  );
  assert.equal(
    futureChildProfileCompanion.rows[0].child_profile_id,
    childProfileA,
  );

  await client.query(
    `INSERT INTO profile.inventory_usages
      VALUES ($1,$2,'location',$3,$4)`,
    [futureLocationUsage, itemA, locationA, householdA],
  );
  const futureLocationReference = await client.query(
    `SELECT location_id, location_world_id
       FROM profile.inventory_typed_owner_references
      WHERE reference_kind = 'usage' AND reference_id = $1`,
    [futureLocationUsage],
  );
  assert.equal(futureLocationReference.rows[0].location_id, locationA);
  assert.equal(futureLocationReference.rows[0].location_world_id, worldA);

  // Cross-household, wrong-subtype and unknown identities fail closed.
  await assert.rejects(
    client.query(
      "INSERT INTO profile.inventory_ownerships VALUES ($1,$2,'character',$3,'active')",
      [invalidOwnership, itemB, npcA],
    ),
    /0 typed owner match|foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO profile.inventory_inventories VALUES ($1,$2,'child_profile',$3,'active')",
      [invalidContainer, householdB, childProfileA],
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
      `INSERT INTO profile.inventory_usages
        VALUES ($1,$2,'location',$3,$4)`,
      [invalidLocationUsage, itemA, locationB, householdA],
    ),
    /0 typed owner match|foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      `INSERT INTO profile.inventory_transfers
        VALUES ($1,$2,'character',$3,'household',$4,$5)`,
      [invalidTransfer, itemB, avatarA, householdB, householdB],
    ),
    /0 typed owner match|foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      `INSERT INTO profile.inventory_usages
        VALUES ($1,$2,'character',$3,$4)`,
      [cleanupUsage, itemA, unknownOwner, householdA],
    ),
    /0 typed owner match|foreign key constraint/,
  );

  // Actor scope itself is also bound to the item's household.
  await assert.rejects(
    client.query(
      `INSERT INTO profile.inventory_usages
        VALUES ($1,$2,'character',$3,$4)`,
      [invalidItemScopeUsage, itemB, avatarA, householdA],
    ),
    /belongs to household .* not actor household/,
  );

  // Half-populated nullable history-from references are rejected.
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
      VALUES ($1,$2,NULL,NULL,'child_profile',$3,$4)`,
    [nullableHistory, itemA, childProfileA, householdA],
  );
  const nullableFromRefs = await client.query(
    `SELECT reference_kind
       FROM profile.inventory_typed_owner_references
      WHERE reference_id = $1
      ORDER BY reference_kind`,
    [nullableHistory],
  );
  assert.deepEqual(
    nullableFromRefs.rows.map((row) => row.reference_kind),
    ["ownership_history_to"],
  );

  // Delete cleanup prevents generic typed-reference orphans.
  await client.query(
    `INSERT INTO profile.inventory_usages
      VALUES ($1,$2,'child_profile',$3,$4)`,
    [cleanupUsage, itemA, childProfileA, householdA],
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

  // All forward-only migrations remain safe if replayed directly.
  await client.query(ownerReferenceMigration);
  await client.query(currentCompanionMigration);
  await client.query(stateActivationMigration);
  const replayedReferenceCount = await client.query(
    "SELECT COUNT(*)::int AS count FROM profile.inventory_typed_owner_references",
  );
  assert.equal(replayedReferenceCount.rows[0].count, 14);

  console.warn("Inventory typed owner reference database self-test OK");
} finally {
  await client.query(resetSchemaSql).catch(() => {});
  await client.end();
}
