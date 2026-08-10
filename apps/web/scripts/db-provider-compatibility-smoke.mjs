import pg from "pg";

const connectionString =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_DIRECT_URL or DATABASE_URL is required.");
  process.exit(1);
}

const requiredSchemas = ["profile", "story", "npc_intelligence"];
const requiredTables = [
  ["public", "parent_accounts"],
  ["profile", "households"],
  ["profile", "child_profiles"],
  ["profile", "worlds"],
  ["story", "story_sessions"],
  ["npc_intelligence", "npc_snapshots"],
];

const client = new pg.Client({ connectionString });

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  await client.connect();

  const versionResult = await client.query(
    "select current_setting('server_version') as server_version, current_database() as database_name, current_user as database_user",
  );
  const identity = versionResult.rows[0];

  const extensionResult = await client.query(
    "select extname from pg_extension where extname = 'pgcrypto'",
  );
  assert(
    extensionResult.rowCount === 1,
    "Required extension pgcrypto is missing.",
  );

  const schemaResult = await client.query(
    "select schema_name from information_schema.schemata where schema_name = any($1::text[])",
    [requiredSchemas],
  );
  const existingSchemas = new Set(
    schemaResult.rows.map((row) => row.schema_name),
  );
  for (const schema of requiredSchemas) {
    assert(existingSchemas.has(schema), `Required schema ${schema} is missing.`);
  }

  for (const [schema, table] of requiredTables) {
    const tableResult = await client.query("select to_regclass($1) as relation", [
      `${schema}.${table}`,
    ]);
    assert(
      tableResult.rows[0]?.relation,
      `Required table ${schema}.${table} is missing.`,
    );
  }

  await client.query("begin");
  try {
    const transactionResult = await client.query(
      "select gen_random_uuid() as generated_uuid, now() as observed_at",
    );
    assert(
      transactionResult.rows[0]?.generated_uuid,
      "gen_random_uuid() did not return a value.",
    );
  } finally {
    await client.query("rollback");
  }

  console.warn("Managed PostgreSQL compatibility smoke: PASS");
  console.warn(`PostgreSQL version: ${identity.server_version}`);
  console.warn(`Database: ${identity.database_name}`);
  console.warn(`User: ${identity.database_user}`);
  console.warn(`Schemas checked: ${requiredSchemas.join(", ")}`);
  console.warn(`Tables checked: ${requiredTables.length}`);
} catch (error) {
  console.error("Managed PostgreSQL compatibility smoke: FAIL");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
