import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { readMigrationManifest } from "./profile-migration-contract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadRootEnv() {
  const envPath = resolve(__dirname, "..", "..", "..", ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf-8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    process.env[key] ??= value;
  }
}

loadRootEnv();

const DATABASE_URL =
  process.env.DATABASE_DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://lumi:lumi_local_only@localhost:15432/lumi";

const MIGRATION_DIR = resolve(__dirname, "..", "migrations");
const MIGRATION_SCOPE = "profiles";
const LOCK_KEY = "lumi:profiles:migrations:v1";

async function ensureLedger(client) {
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

async function loadAppliedMigrations(client) {
  const result = await client.query(
    `
      SELECT migration_file, sequence_id, checksum_sha256, applied_at
      FROM public.lumi_schema_migrations
      WHERE scope = $1
      ORDER BY migration_file
    `,
    [MIGRATION_SCOPE],
  );

  return result.rows;
}

async function profileSchemaAlreadyExists(client) {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'profile'
    ) AS exists
  `);

  return result.rows[0]?.exists === true;
}

function verifyLedgerAgainstRepository(appliedRows, migrations) {
  const repoByFile = new Map(migrations.map((migration) => [migration.file, migration]));

  for (const row of appliedRows) {
    const migration = repoByFile.get(row.migration_file);

    if (!migration) {
      throw new Error(
        `Applied profile migration ${row.migration_file} is missing from the repository. ` +
          "Refusing to continue because migration history was rewritten or deleted.",
      );
    }

    if (migration.sequence !== row.sequence_id) {
      throw new Error(
        `Sequence drift detected for ${row.migration_file}: ` +
          `database=${row.sequence_id}, repository=${migration.sequence}`,
      );
    }

    if (migration.checksum !== row.checksum_sha256) {
      throw new Error(
        `Checksum drift detected for applied migration ${row.migration_file}. ` +
          "Applied migrations are immutable; create a new migration instead of editing history.",
      );
    }
  }
}

async function applyMigration(client, migration) {
  await client.query("BEGIN");

  try {
    console.warn(`Applying profile migration: ${migration.file}`);
    await client.query(migration.sql);
    await client.query(
      `
        INSERT INTO public.lumi_schema_migrations (
          scope,
          migration_file,
          sequence_id,
          checksum_sha256
        ) VALUES ($1, $2, $3, $4)
      `,
      [MIGRATION_SCOPE, migration.file, migration.sequence, migration.checksum],
    );
    await client.query("COMMIT");
    console.warn(`Profile migration ${migration.file} applied successfully`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const migrations = readMigrationManifest(MIGRATION_DIR);
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  const client = await pool.connect();

  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [LOCK_KEY]);
    await ensureLedger(client);

    const appliedRows = await loadAppliedMigrations(client);

    if (appliedRows.length === 0 && (await profileSchemaAlreadyExists(client))) {
      throw new Error(
        "The profile schema already contains tables, but the migration ledger is empty. " +
          "Refusing to guess which migrations were previously applied. " +
          "An audited one-time baseline must be performed before this runner can manage the database.",
      );
    }

    verifyLedgerAgainstRepository(appliedRows, migrations);

    const appliedFiles = new Set(appliedRows.map((row) => row.migration_file));
    const pending = migrations.filter((migration) => !appliedFiles.has(migration.file));

    for (const migration of pending) {
      await applyMigration(client, migration);
    }

    console.warn(
      `Profile migrations verified: ${migrations.length} known, ${pending.length} applied, ` +
        `${migrations.length - pending.length} already recorded`,
    );
  } catch (error) {
    console.error("Profile migration failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [LOCK_KEY]);
    } catch (unlockError) {
      console.error("Failed to release profile migration advisory lock:", unlockError);
      process.exitCode = 1;
    }

    client.release();
    await pool.end();
  }
}

await main();
