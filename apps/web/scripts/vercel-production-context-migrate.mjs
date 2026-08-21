import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const isProductionVercelBuild = process.env.VERCEL_ENV === "production";

if (!isProductionVercelBuild) {
  console.warn(
    `Skipping production context migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`,
  );
  process.exit(0);
}

const databaseUrl =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? null;

if (!databaseUrl) {
  console.error(
    "Production Vercel build requires DATABASE_DIRECT_URL or DATABASE_URL before context migrations can run.",
  );
  process.exit(1);
}

const migrationFiles = [
  "0076_ai_generation_context_trace.sql",
  "0077_generation_context_snapshots.sql",
];
const migrationDirectory = fileURLToPath(
  new URL("../../../packages/profiles/migrations/", import.meta.url),
);

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });

try {
  console.warn("Applying production Context Assembly profile migrations...");
  for (const migrationFile of migrationFiles) {
    const sql = readFileSync(
      resolve(migrationDirectory, migrationFile),
      "utf8",
    );
    console.warn(`Applying profile migration: ${migrationFile}`);
    await pool.query(sql);
    console.warn(`Profile migration ${migrationFile} applied successfully.`);
  }
  console.warn(
    "Production Context Assembly profile migrations are up to date.",
  );
} catch (error) {
  console.error("Production Context Assembly profile migration failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
