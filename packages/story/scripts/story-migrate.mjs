import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadRootEnv() {
  const envPath = resolve(__dirname, "..", "..", "..", ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    process.env[key] ??= value;
  }
}

loadRootEnv();

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://lumi:lumi_local_only@localhost:15432/lumi";

const MIGRATION_DIR = resolve(__dirname, "..", "migrations");

async function ensureLedger(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS story._story_migration_ledger (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedFiles(pool) {
  try {
    const result = await pool.query(
      "SELECT filename FROM story._story_migration_ledger ORDER BY id",
    );
    return new Set(result.rows.map((r) => r.filename));
  } catch {
    return new Set();
  }
}

async function main() {
  const files = readdirSync(MIGRATION_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  try {
    await ensureLedger(pool);
    const applied = await getAppliedFiles(pool);

    for (const file of files) {
      if (applied.has(file)) {
        console.warn(`Skipping already-applied migration: ${file}`);
        continue;
      }

      const filePath = join(MIGRATION_DIR, file);
      const sql = readFileSync(filePath, "utf-8");
      console.warn(`Applying migration: ${file}`);
      await pool.query(sql);
      await pool.query(
        "INSERT INTO story._story_migration_ledger (filename) VALUES ($1)",
        [file],
      );
      console.warn(`Migration ${file} applied successfully`);
    }
    console.warn(`All ${files.length} story migrations applied successfully`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
