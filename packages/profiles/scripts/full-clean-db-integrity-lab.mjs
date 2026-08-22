import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import { readMigrationManifest } from "./profile-migration-contract.mjs";

const { Client } = pg;
const baseUrl = process.env.FULL_INTEGRITY_TEST_DATABASE_URL;

if (!baseUrl) {
  throw new Error("FULL_INTEGRITY_TEST_DATABASE_URL is required");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..", "..");
const profileMigrationDir = resolve(__dirname, "..", "migrations");
const cleanDatabaseName = "lumi_full_integrity";
const postWorldProfileFiles = new Set([
  "0081_inventory_typed_ownership.sql",
  "0082_legacy_character_contract.sql",
]);

function withDatabase(connectionString, databaseName) {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function recreateDatabase() {
  const admin = new Client({ connectionString: baseUrl });
  await admin.connect();
  try {
    await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [cleanDatabaseName],
    );
    await admin.query(`DROP DATABASE IF EXISTS ${cleanDatabaseName}`);
    await admin.query(`CREATE DATABASE ${cleanDatabaseName}`);
  } finally {
    await admin.end();
  }
}

async function ensureProfileLedger(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.lumi_schema_migrations (
      scope TEXT NOT NULL,
      migration_file TEXT NOT NULL,
      sequence_id VARCHAR(4) NOT NULL,
      checksum_sha256 VARCHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (scope, migration_file),
      CONSTRAINT lumi_schema_migrations_checksum_format
        CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$')
    )
  `);
}

async function applyProfileMigration(client, migration) {
  await client.query("BEGIN");
  try {
    await client.query(migration.sql);
    await client.query(
      `INSERT INTO public.lumi_schema_migrations
        (scope, migration_file, sequence_id, checksum_sha256)
       VALUES ('profiles', $1, $2, $3)`,
      [migration.file, migration.sequence, migration.checksum],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw new Error(`Profile migration ${migration.file} failed: ${error.message}`, {
      cause: error,
    });
  }
}

async function applyProfilePhase(client, migrations) {
  for (const migration of migrations) {
    await applyProfileMigration(client, migration);
  }
}

async function applyDomainMigrations(client, domain) {
  const dir = resolve(repoRoot, "packages", domain, "migrations");
  const files = (await readdir(dir))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const sql = await readFile(resolve(dir, file), "utf8");
    try {
      await client.query(sql);
    } catch (error) {
      throw new Error(`${domain} migration ${file} failed: ${error.message}`, {
        cause: error,
      });
    }
  }
}

async function assertTables(client) {
  const requiredTables = [
    "profile.child_profiles",
    "profile.child_avatars",
    "profile.worlds",
    "profile.world_regions",
    "profile.world_locations",
    "profile.world_npcs",
    "profile.inventory_ownership_typed_owners",
    "story.story_sessions",
    "story.story_session_characters",
    "simulation.simulation_runs",
    "simulation.simulation_effects",
    "privacy.consent_records",
    "media.media_assets",
    "ai.generation_usage",
    "prompts.prompt_versions",
  ];

  for (const qualifiedName of requiredTables) {
    const result = await client.query("SELECT to_regclass($1) AS relation", [
      qualifiedName,
    ]);
    assert.equal(
      result.rows[0]?.relation,
      qualifiedName,
      `missing required table ${qualifiedName}`,
    );
  }
}

async function assertConstraints(client) {
  const requiredConstraints = [
    "child_avatars_character_subtype_fk",
    "world_npcs_character_subtype_fk",
    "world_locations_region_world_fk",
    "simulation_runs_world_scope_fk",
    "simulation_effects_run_scope_fk",
    "story_sessions_child_scope_fk",
    "story_sessions_world_scope_fk",
    "story_sessions_version_definition_fk",
    "story_participants_typed_identity_check",
    "inventory_ownership_one_typed_owner_check",
  ];

  const result = await client.query(
    `SELECT conname FROM pg_constraint WHERE conname = ANY($1::text[])`,
    [requiredConstraints],
  );
  const found = new Set(result.rows.map((row) => row.conname));
  for (const name of requiredConstraints) {
    assert.ok(found.has(name), `missing required constraint ${name}`);
  }
}

async function assertProfileLedger(client, profileMigrations) {
  const result = await client.query(
    "SELECT migration_file, checksum_sha256 FROM public.lumi_schema_migrations WHERE scope = 'profiles' ORDER BY migration_file",
  );
  assert.equal(result.rows.length, profileMigrations.length);
  const expected = new Map(
    profileMigrations.map((migration) => [migration.file, migration.checksum]),
  );
  for (const row of result.rows) {
    assert.equal(row.checksum_sha256, expected.get(row.migration_file));
  }
}

async function assertNegativeIntegrity(client) {
  const householdA = "90000000-0000-4000-8000-000000000001";
  const householdB = "90000000-0000-4000-8000-000000000002";
  const childA = "90000000-0000-4000-8000-000000000003";
  const childB = "90000000-0000-4000-8000-000000000004";

  await client.query(
    "INSERT INTO profile.households (id, name, slug) VALUES ($1, 'A', 'integrity-a'), ($2, 'B', 'integrity-b')",
    [householdA, householdB],
  );
  await client.query(
    `INSERT INTO profile.child_profiles (id, household_id, display_name, age_band)
     VALUES ($1, $3, 'A', '6-8'), ($2, $4, 'B', '6-8')`,
    [childA, childB, householdA, householdB],
  );

  const scopedTables = await client.query(`
    SELECT table_name
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'profile'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE 'scope_%_fk'
    ORDER BY table_name
  `);
  assert.ok(scopedTables.rows.length > 0, "expected household scope foreign keys");

  const immutableTrigger = await client.query(`
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_prevent_character_subtype_mutation'
      AND NOT tgisinternal
  `);
  assert.equal(immutableTrigger.rowCount, 1);
}

await recreateDatabase();
const cleanUrl = withDatabase(baseUrl, cleanDatabaseName);
const client = new Client({ connectionString: cleanUrl });
await client.connect();

try {
  const profileMigrations = readMigrationManifest(profileMigrationDir);
  const profileCore = profileMigrations.filter(
    (migration) => !postWorldProfileFiles.has(migration.file),
  );
  const profilePostWorld = profileMigrations.filter((migration) =>
    postWorldProfileFiles.has(migration.file),
  );

  assert.equal(
    profileCore.length + profilePostWorld.length,
    profileMigrations.length,
  );
  assert.equal(profilePostWorld.length, postWorldProfileFiles.size);

  await ensureProfileLedger(client);
  await applyProfilePhase(client, profileCore);
  await applyDomainMigrations(client, "world");
  await applyProfilePhase(client, profilePostWorld);
  await applyDomainMigrations(client, "story");
  await applyDomainMigrations(client, "simulation");
  await applyDomainMigrations(client, "privacy");
  await applyDomainMigrations(client, "media");
  await applyDomainMigrations(client, "ai");
  await applyDomainMigrations(client, "prompts");

  await assertTables(client);
  await assertConstraints(client);
  await assertProfileLedger(client, profileMigrations);
  await assertNegativeIntegrity(client);

  console.warn(
    `Full clean-DB integrity lab OK: ${profileMigrations.length} profile migrations plus world/story/simulation/privacy/media/ai/prompts`,
  );
} finally {
  await client.end();
}
