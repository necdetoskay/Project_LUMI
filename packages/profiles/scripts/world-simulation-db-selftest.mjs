import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.WORLD_SIM_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("WORLD_SIM_TEST_DATABASE_URL is required");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const worldMigration = await readFile(
  resolve(
    __dirname,
    "..",
    "..",
    "world",
    "migrations",
    "0013_world_hierarchy_integrity.sql",
  ),
  "utf8",
);
const simulationMigration = await readFile(
  resolve(
    __dirname,
    "..",
    "..",
    "simulation",
    "migrations",
    "0002_scope_integrity.sql",
  ),
  "utf8",
);

const h1 = "20000000-0000-4000-8000-000000000001";
const h2 = "20000000-0000-4000-8000-000000000002";
const w1 = "20000000-0000-4000-8000-000000000003";
const w2 = "20000000-0000-4000-8000-000000000004";
const r1 = "20000000-0000-4000-8000-000000000005";
const l1 = "20000000-0000-4000-8000-000000000006";
const run1 = "20000000-0000-4000-8000-000000000007";
const effect1 = "20000000-0000-4000-8000-000000000008";

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(
    "DROP SCHEMA IF EXISTS simulation CASCADE; DROP SCHEMA IF EXISTS profile CASCADE",
  );
  await client.query("CREATE SCHEMA profile; CREATE SCHEMA simulation");
  await client.query(`
    CREATE TABLE profile.worlds (id uuid PRIMARY KEY, household_id uuid NOT NULL);
    CREATE TABLE profile.world_regions (id uuid PRIMARY KEY, world_id uuid NOT NULL);
    CREATE TABLE profile.world_locations (id uuid PRIMARY KEY, world_id uuid NOT NULL, region_id uuid NOT NULL);
    CREATE TABLE profile.world_npcs (character_id uuid PRIMARY KEY, world_id uuid NOT NULL, household_id uuid NOT NULL);
    CREATE TABLE simulation.world_clocks (world_id uuid PRIMARY KEY, household_id uuid NOT NULL);
    CREATE TABLE simulation.simulation_runs (id uuid PRIMARY KEY, world_id uuid NOT NULL, household_id uuid NOT NULL);
    CREATE TABLE simulation.simulation_effects (id uuid PRIMARY KEY, run_id uuid NOT NULL, world_id uuid NOT NULL, household_id uuid NOT NULL);
    CREATE TABLE simulation.scheduled_events (id uuid PRIMARY KEY, world_id uuid NOT NULL, household_id uuid NOT NULL);
  `);
  await client.query(
    "INSERT INTO profile.worlds (id, household_id) VALUES ($1,$2),($3,$4)",
    [w1, h1, w2, h2],
  );
  await client.query(
    "INSERT INTO profile.world_regions (id, world_id) VALUES ($1,$2)",
    [r1, w1],
  );
  await client.query(
    "INSERT INTO profile.world_locations (id, world_id, region_id) VALUES ($1,$2,$3)",
    [l1, w2, r1],
  );
  await assert.rejects(
    client.query(worldMigration),
    /World hierarchy mismatch/,
  );
  await client.query(
    "UPDATE profile.world_locations SET world_id=$1 WHERE id=$2",
    [w1, l1],
  );
  await client.query(worldMigration);
  await assert.rejects(
    client.query(
      "INSERT INTO profile.world_locations (id, world_id, region_id) VALUES (gen_random_uuid(),$1,$2)",
      [w2, r1],
    ),
    /foreign key constraint/,
  );

  await client.query(
    "INSERT INTO simulation.simulation_runs (id, world_id, household_id) VALUES ($1,$2,$3)",
    [run1, w1, h1],
  );
  await client.query(simulationMigration);
  await client.query(
    "INSERT INTO simulation.simulation_effects (id, run_id, world_id, household_id) VALUES ($1,$2,$3,$4)",
    [effect1, run1, w1, h1],
  );
  await assert.rejects(
    client.query(
      "INSERT INTO simulation.simulation_effects (id, run_id, world_id, household_id) VALUES (gen_random_uuid(),$1,$2,$3)",
      [run1, w2, h2],
    ),
    /foreign key constraint/,
  );
  await assert.rejects(
    client.query(
      "INSERT INTO simulation.simulation_runs (id, world_id, household_id) VALUES (gen_random_uuid(),$1,$2)",
      [w1, h2],
    ),
    /foreign key constraint/,
  );
  console.warn("World and simulation integrity database self-test OK");
} finally {
  await client
    .query(
      "DROP SCHEMA IF EXISTS simulation CASCADE; DROP SCHEMA IF EXISTS profile CASCADE",
    )
    .catch(() => {});
  await client.end();
}
