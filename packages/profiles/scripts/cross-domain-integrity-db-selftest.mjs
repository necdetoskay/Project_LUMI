import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.CROSS_DOMAIN_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("CROSS_DOMAIN_TEST_DATABASE_URL is required");
const __dirname = dirname(fileURLToPath(import.meta.url));
const readMigration = (pkg, file) =>
  readFile(resolve(__dirname, "..", "..", pkg, "migrations", file), "utf8");
const [privacySql, mediaSql, aiSql, promptSql] = await Promise.all([
  readMigration("privacy", "0002_scope_and_status_integrity.sql"),
  readMigration("media", "0003_scope_and_numeric_integrity.sql"),
  readMigration("ai", "0007_usage_numeric_integrity.sql"),
  readMigration("prompts", "0002_prompt_integrity.sql"),
]);
const ids = Array.from({ length: 12 }, (_, i) =>
  `50000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
);
const [h1, h2, child, world, consent, exp, asset, gen, registry, version, activation, usage] = ids;
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("DROP SCHEMA IF EXISTS privacy,media,ai,prompts,profile CASCADE");
  await client.query("CREATE SCHEMA profile; CREATE SCHEMA privacy; CREATE SCHEMA media; CREATE SCHEMA ai; CREATE SCHEMA prompts");
  await client.query(`
    CREATE TABLE profile.households (id uuid PRIMARY KEY);
    CREATE TABLE profile.child_profiles (id uuid PRIMARY KEY, household_id uuid NOT NULL, UNIQUE(id,household_id));
    CREATE TABLE profile.worlds (id uuid PRIMARY KEY, household_id uuid NOT NULL, UNIQUE(id,household_id));
    CREATE TABLE privacy.consent_records (
      id uuid PRIMARY KEY, household_id uuid NOT NULL, child_profile_id uuid,
      status varchar(20) NOT NULL, granted_at timestamptz NOT NULL, revoked_at timestamptz
    );
    CREATE TABLE privacy.data_export_records (id uuid PRIMARY KEY, household_id uuid NOT NULL, child_profile_id uuid NOT NULL);
    CREATE TABLE media.media_assets (
      id uuid PRIMARY KEY, household_id uuid NOT NULL, child_profile_id uuid NOT NULL, world_id uuid NOT NULL,
      width integer, height integer, duration_seconds integer, version integer NOT NULL
    );
    CREATE TABLE media.media_asset_generations (id uuid PRIMARY KEY, cost_usd numeric(20,8) NOT NULL DEFAULT 0);
    CREATE TABLE ai.generation_usage (
      id uuid PRIMARY KEY, input_tokens integer NOT NULL, output_tokens integer NOT NULL, total_tokens integer NOT NULL,
      latency_ms integer NOT NULL, attempt integer NOT NULL, cost_usd numeric(20,8) NOT NULL,
      started_at timestamptz NOT NULL, completed_at timestamptz NOT NULL
    );
    CREATE TABLE prompts.prompt_registries (id uuid PRIMARY KEY, household_id uuid NOT NULL);
    CREATE TABLE prompts.prompt_versions (
      id uuid PRIMARY KEY, registry_id uuid NOT NULL, version_number integer NOT NULL, status varchar(20) NOT NULL,
      template_body text NOT NULL, variable_schema jsonb NOT NULL DEFAULT '[]', model_preferences jsonb NOT NULL DEFAULT '{}',
      output_schema jsonb NOT NULL DEFAULT '{}', published_at timestamptz, archived_at timestamptz
    );
    CREATE TABLE prompts.prompt_activations (
      id uuid PRIMARY KEY, registry_id uuid NOT NULL, active_version_id uuid NOT NULL, household_id uuid NOT NULL
    );
  `);
  await client.query("INSERT INTO profile.households VALUES ($1),($2)", [h1, h2]);
  await client.query("INSERT INTO profile.child_profiles VALUES ($1,$2)", [child, h1]);
  await client.query("INSERT INTO profile.worlds VALUES ($1,$2)", [world, h1]);
  await client.query(privacySql);
  await client.query(mediaSql);
  await client.query(aiSql);
  await client.query(promptSql);

  await client.query(
    "INSERT INTO privacy.consent_records VALUES ($1,$2,$3,'granted',now(),NULL)",
    [consent, h1, child],
  );
  await assert.rejects(
    client.query("INSERT INTO privacy.data_export_records VALUES ($1,$2,$3)", [exp, h2, child]),
    /foreign key constraint/,
  );
  await client.query(
    "INSERT INTO media.media_assets VALUES ($1,$2,$3,$4,100,100,NULL,1)",
    [asset, h1, child, world],
  );
  await assert.rejects(
    client.query("INSERT INTO media.media_asset_generations VALUES ($1,-1)", [gen]),
    /check constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO ai.generation_usage VALUES ($1,1,1,1,0,1,0,now(),now())",
      [usage],
    ),
    /check constraint/,
  );
  await client.query("INSERT INTO prompts.prompt_registries VALUES ($1,$2)", [registry, h1]);
  await client.query(
    "INSERT INTO prompts.prompt_versions VALUES ($1,$2,1,'published','v1','[]','{}','{}',now(),NULL)",
    [version, registry],
  );
  await client.query("INSERT INTO prompts.prompt_activations VALUES ($1,$2,$3,$4)", [activation, registry, version, h1]);
  await assert.rejects(
    client.query("UPDATE prompts.prompt_versions SET template_body='mutated' WHERE id=$1", [version]),
    /Published prompt versions are immutable/,
  );
  console.warn("Cross-domain integrity database self-test OK");
} finally {
  await client.query("DROP SCHEMA IF EXISTS privacy,media,ai,prompts,profile CASCADE").catch(() => {});
  await client.end();
}
