import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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

async function main() {
  const files = readdirSync(MIGRATION_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  try {
    for (const file of files) {
      const filePath = join(MIGRATION_DIR, file);
      const sql = readFileSync(filePath, "utf-8");
      console.warn(`Applying migration: ${file}`);
      await pool.query(sql);
      console.warn(`Migration ${file} applied successfully`);
    }
    console.warn(`All ${files.length} profile migrations applied successfully`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
