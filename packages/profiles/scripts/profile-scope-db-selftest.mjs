import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.PROFILE_SCOPE_TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("PROFILE_SCOPE_TEST_DATABASE_URL is required");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(
  __dirname,
  "..",
  "migrations",
  "0078_household_scope_constraints.sql",
);
const migrationSql = await readFile(migrationPath, "utf8");

const householdA = "00000000-0000-4000-8000-000000000001";
const householdB = "00000000-0000-4000-8000-000000000002";
const childA = "00000000-0000-4000-8000-000000000003";
const probeValid = "00000000-0000-4000-8000-000000000004";
const probeMismatch = "00000000-0000-4000-8000-000000000005";

const dropSchemaSql = "DROP SCHEMA IF EXISTS profile CASCADE";
const createSchemaSql = "CREATE SCHEMA profile";
const insertHouseholdsSql =
  "INSERT INTO profile.households (id) VALUES ($1), ($2)";
const insertChildSql =
  "INSERT INTO profile.child_profiles (id, household_id) VALUES ($1, $2)";
const insertProbeSql = `
  INSERT INTO profile.scope_probe (id, child_profile_id, household_id)
  VALUES ($1, $2, $3)
`;
const deleteProbeSql = "DELETE FROM profile.scope_probe";
const deleteChildSql = "DELETE FROM profile.child_profiles WHERE id = $1";
const selectProbeSql = `
  SELECT child_profile_id, household_id
  FROM profile.scope_probe
  WHERE id = $1
`;

const client = new Client({ connectionString: databaseUrl });

async function resetFixture() {
  await client.query(dropSchemaSql);
  await client.query(createSchemaSql);
  await client.query(`
    CREATE TABLE profile.households (
      id uuid PRIMARY KEY
    )
  `);
  await client.query(`
    CREATE TABLE profile.child_profiles (
      id uuid PRIMARY KEY,
      household_id uuid NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE
    )
  `);
  await client.query(`
    CREATE TABLE profile.scope_probe (
      id uuid PRIMARY KEY,
      child_profile_id uuid REFERENCES profile.child_profiles(id) ON DELETE SET NULL,
      household_id uuid NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE
    )
  `);
  await client.query(insertHouseholdsSql, [householdA, householdB]);
  await client.query(insertChildSql, [childA, householdA]);
}

await client.connect();

try {
  await resetFixture();

  await client.query(insertProbeSql, [probeMismatch, childA, householdB]);

  await client.query("BEGIN");
  await assert.rejects(
    client.query(migrationSql),
    /Household scope mismatch detected in profile\.scope_probe/,
  );
  await client.query("ROLLBACK");

  await client.query(deleteProbeSql);
  await client.query(migrationSql);

  const constraints = await client.query(`
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'profile.scope_probe'::regclass
      AND contype = 'f'
      AND conname LIKE 'scope_%_fk'
  `);
  assert.equal(constraints.rowCount, 1);

  await client.query(insertProbeSql, [probeValid, childA, householdA]);

  await assert.rejects(
    client.query(insertProbeSql, [probeMismatch, childA, householdB]),
    /violates foreign key constraint/,
  );

  await client.query(deleteChildSql, [childA]);
  const preserved = await client.query(selectProbeSql, [probeValid]);
  assert.equal(preserved.rowCount, 1);
  assert.equal(preserved.rows[0].child_profile_id, null);
  assert.equal(preserved.rows[0].household_id, householdA);

  console.warn("Profile household scope database self-test OK");
} finally {
  await client.query(dropSchemaSql).catch(() => {});
  await client.end();
}
