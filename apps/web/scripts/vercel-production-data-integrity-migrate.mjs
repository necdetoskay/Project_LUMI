import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const isProductionVercelBuild = process.env.VERCEL_ENV === "production";

if (!isProductionVercelBuild) {
  console.warn(
    `Skipping production Data Integrity migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`,
  );
  process.exit(0);
}

const databaseUrl =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? null;

if (!databaseUrl) {
  console.error(
    "Production Vercel build requires DATABASE_DIRECT_URL or DATABASE_URL before Data Integrity migrations can run.",
  );
  process.exit(1);
}

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const migrations = [
  ["profiles", "0078_household_scope_constraints.sql"],
  ["profiles", "0079_child_avatar_identity_split.sql"],
  ["profiles", "0080_child_avatar_registry_sync.sql"],
  ["world", "0012_world_npc_identity_split.sql"],
  ["world", "0013_world_hierarchy_integrity.sql"],
  ["simulation", "0002_scope_integrity.sql"],
  ["story", "0010_story_integrity.sql"],
  ["world", "0014_inventory_typed_ownership.sql"],
];

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });

try {
  console.warn("Applying production Data Integrity dependency migrations...");

  for (const [packageName, migrationFile] of migrations) {
    const migrationPath = resolve(
      repositoryRoot,
      "packages",
      packageName,
      "migrations",
      migrationFile,
    );
    const sql = readFileSync(migrationPath, "utf8");

    console.warn(`Applying ${packageName} migration: ${migrationFile}`);
    await pool.query(sql);
    console.warn(
      `${packageName} migration ${migrationFile} applied successfully.`,
    );
  }

  console.warn("Production Data Integrity dependency migrations are up to date.");
} catch (error) {
  console.error("Production Data Integrity dependency migration failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
