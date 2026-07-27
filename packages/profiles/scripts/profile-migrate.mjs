import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://lumi:lumi_local_only@localhost:15432/lumi";

async function main() {
  const migrationPath = resolve(__dirname, "..", "migrations", "0001_profile_schema.sql");
  const sql = readFileSync(migrationPath, "utf-8");

  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  try {
    await pool.query(sql);
    console.log("Profile migration applied successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
