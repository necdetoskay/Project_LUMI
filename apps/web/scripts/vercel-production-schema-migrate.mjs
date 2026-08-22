import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import pg from "pg";

const TARGET_GENERATION = 1;
const LOCK_KEY = "lumi:production-schema-bootstrap:v1";
const isProductionVercelBuild = process.env.VERCEL_ENV === "production";

if (!isProductionVercelBuild) {
  console.warn(
    `Skipping production schema migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`,
  );
  process.exit(0);
}

const databaseUrl =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? null;

if (!databaseUrl) {
  console.error(
    "Production Vercel build requires DATABASE_DIRECT_URL or DATABASE_URL before schema migrations can run.",
  );
  process.exit(1);
}

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const migrationSteps = [
  ["auth", "@lumi/web", "auth:migrate"],
  ["profiles", "@lumi/profiles", "profile:migrate"],
  ["world", "@lumi/world", "world:migrate"],
  ["npc-intelligence", "@lumi/npc-intelligence", "npc:migrate"],
  ["story", "@lumi/story", "story:migrate"],
  ["simulation", "@lumi/simulation", "simulation:migrate"],
  ["privacy", "@lumi/privacy", "privacy:migrate"],
  ["media", "@lumi/media", "media:migrate"],
  ["ai", "@lumi/ai", "ai:migrate"],
  ["prompts", "@lumi/prompts", "prompt:migrate"],
];

const requiredRelations = [
  "public.parent_accounts",
  "profile.child_profiles",
  "profile.child_avatars",
  "profile.worlds",
  "profile.world_npcs",
  "npc_intelligence.decision_traces",
  "story.story_sessions",
  "simulation.simulation_runs",
  "privacy.consent_records",
  "media.media_assets",
  "ai.generation_usage",
  "prompts.prompt_versions",
];

async function readGenerationState(client) {
  const relation = await client.query(
    "SELECT to_regclass('public.lumi_schema_generation') AS relation",
  );

  if (!relation.rows[0]?.relation) {
    return { kind: "unmarked" };
  }

  const result = await client.query(
    "SELECT generation FROM public.lumi_schema_generation WHERE singleton = TRUE",
  );

  if (result.rowCount !== 1) {
    throw new Error(
      "Schema generation marker table exists without exactly one singleton row; refusing destructive recovery.",
    );
  }

  const generation = Number(result.rows[0].generation);
  if (generation !== TARGET_GENERATION) {
    throw new Error(
      `Unsupported production schema generation ${generation}; expected ${TARGET_GENERATION}. Explicit migration is required.`,
    );
  }

  return { kind: "managed", generation };
}

async function resetUnmarkedLegacyDatabase(client) {
  console.warn(
    "No production schema generation marker found. Resetting legacy LUMI data before clean bootstrap.",
  );

  await client.query("BEGIN");
  try {
    await client.query(`
      DROP SCHEMA IF EXISTS prompts CASCADE;
      DROP SCHEMA IF EXISTS privacy CASCADE;
      DROP SCHEMA IF EXISTS media CASCADE;
      DROP SCHEMA IF EXISTS ai CASCADE;
      DROP SCHEMA IF EXISTS simulation CASCADE;
      DROP SCHEMA IF EXISTS story CASCADE;
      DROP SCHEMA IF EXISTS npc_intelligence CASCADE;
      DROP SCHEMA IF EXISTS profile CASCADE;

      DROP TABLE IF EXISTS public.parent_password_reset_tokens CASCADE;
      DROP TABLE IF EXISTS public.parent_sessions CASCADE;
      DROP TABLE IF EXISTS public.parent_accounts CASCADE;
      DROP TABLE IF EXISTS public.lumi_schema_migrations CASCADE;
      DROP TABLE IF EXISTS public.lumi_schema_generation CASCADE;
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

function runMigrationStep([label, packageName, script]) {
  console.warn(`Running production migration domain: ${label}`);
  const result = spawnSync("pnpm", ["--filter", packageName, script], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to start ${label} migration`, {
      cause: result.error,
    });
  }

  if (result.status !== 0) {
    throw new Error(
      `${label} migration failed with exit code ${String(result.status)}`,
    );
  }
}

async function verifySchema(client) {
  for (const relationName of requiredRelations) {
    const result = await client.query("SELECT to_regclass($1) AS relation", [
      relationName,
    ]);
    if (!result.rows[0]?.relation) {
      throw new Error(`Production schema verification failed: ${relationName}`);
    }
  }

  const profileIntegrity = await client.query(
    `
    SELECT migration_file
    FROM public.lumi_schema_migrations
    WHERE scope = 'profiles'
      AND migration_file = ANY($1::text[])
  `,
    [
      [
        "0078_household_scope_constraints.sql",
        "0079_child_avatar_identity_split.sql",
        "0080_child_avatar_registry_sync.sql",
      ],
    ],
  );

  if (profileIntegrity.rowCount !== 3) {
    throw new Error(
      "Production profile migration ledger is missing required integrity migrations.",
    );
  }
}

async function writeGenerationMarker(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.lumi_schema_generation (
      singleton boolean PRIMARY KEY DEFAULT TRUE,
      generation integer NOT NULL CHECK (generation > 0),
      bootstrapped_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT lumi_schema_generation_singleton CHECK (singleton = TRUE)
    )
  `);
  await client.query(
    `INSERT INTO public.lumi_schema_generation (singleton, generation, bootstrapped_at)
     VALUES (TRUE, $1, now())
     ON CONFLICT (singleton)
     DO UPDATE SET generation = EXCLUDED.generation,
                   bootstrapped_at = EXCLUDED.bootstrapped_at`,
    [TARGET_GENERATION],
  );
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
let acquiredLock = false;

try {
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [LOCK_KEY]);
  acquiredLock = true;

  const generationState = await readGenerationState(client);
  const needsBootstrap = generationState.kind === "unmarked";

  if (needsBootstrap) {
    await resetUnmarkedLegacyDatabase(client);
  } else {
    console.warn(
      `Production schema generation ${generationState.generation} is managed; running forward migrations only.`,
    );
  }

  for (const step of migrationSteps) {
    runMigrationStep(step);
  }

  await verifySchema(client);

  if (needsBootstrap) {
    await writeGenerationMarker(client);
    console.warn(
      `Clean production schema bootstrap completed at generation ${TARGET_GENERATION}.`,
    );
  }

  console.warn("Production schema migrations and verification completed.");
} catch (error) {
  console.error("Production schema migration orchestration failed:", error);
  process.exitCode = 1;
} finally {
  if (acquiredLock) {
    await client
      .query("SELECT pg_advisory_unlock(hashtext($1))", [LOCK_KEY])
      .catch((error) => {
        console.error(
          "Failed to release production schema migration lock:",
          error,
        );
        process.exitCode = 1;
      });
  }
  client.release();
  await pool.end();
}
