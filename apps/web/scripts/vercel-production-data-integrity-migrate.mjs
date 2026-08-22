import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const isProductionVercelBuild = process.env.VERCEL_ENV === "production";

if (!isProductionVercelBuild) {
  console.warn(
    `Skipping production data-integrity migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`,
  );
  process.exit(0);
}

const databaseUrl =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? null;

if (!databaseUrl) {
  console.error(
    "Production Vercel build requires DATABASE_DIRECT_URL or DATABASE_URL before data-integrity migrations can run.",
  );
  process.exit(1);
}

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const migrations = [
  {
    domain: "profiles",
    filename: "0078_household_scope_constraints.sql",
  },
  {
    domain: "profiles",
    filename: "0079_child_avatar_identity_split.sql",
  },
  {
    domain: "profiles",
    filename: "0080_child_avatar_registry_sync.sql",
  },
  {
    domain: "world",
    filename: "0012_world_npc_identity_split.sql",
  },
  {
    domain: "world",
    filename: "0013_world_hierarchy_integrity.sql",
  },
  {
    domain: "simulation",
    filename: "0002_scope_integrity.sql",
  },
  {
    domain: "story",
    filename: "0010_story_integrity.sql",
  },
  {
    domain: "world",
    filename: "0014_inventory_typed_ownership.sql",
  },
];

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();

try {
  console.warn(
    "Applying dependency-ordered production data-integrity migrations...",
  );

  for (const migration of migrations) {
    const migrationPath = resolve(
      repositoryRoot,
      "packages",
      migration.domain,
      "migrations",
      migration.filename,
    );
    const sql = readFileSync(migrationPath, "utf8");
    const label = `${migration.domain}/${migration.filename}`;

    console.warn(`Applying integrity migration: ${label}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("COMMIT");
      console.warn(`Integrity migration ${label} applied successfully.`);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`Integrity migration ${label} failed:`, error);
      throw error;
    }
  }

  console.warn("Production data-integrity migrations are up to date.");
} catch (error) {
  console.error("Production data-integrity migration sequence failed:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
