export async function ensureStoryMigrationLedger(client) {
  await client.query("CREATE SCHEMA IF NOT EXISTS story;");
  await client.query(`
    CREATE TABLE IF NOT EXISTS story._story_migration_ledger (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function getAppliedStoryMigrationFiles(client) {
  const result = await client.query(
    "SELECT filename FROM story._story_migration_ledger ORDER BY id",
  );
  return new Set(result.rows.map((row) => row.filename));
}

export async function applyStoryMigration(
  pool,
  { filename, sql, afterSqlApplied },
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureStoryMigrationLedger(client);

    const alreadyApplied = await client.query(
      "SELECT 1 FROM story._story_migration_ledger WHERE filename = $1",
      [filename],
    );
    if (alreadyApplied.rowCount > 0) {
      await client.query("COMMIT");
      return { status: "skipped" };
    }

    await client.query(sql);
    if (afterSqlApplied) {
      await afterSqlApplied();
    }
    await client.query(
      "INSERT INTO story._story_migration_ledger (filename) VALUES ($1)",
      [filename],
    );
    await client.query("COMMIT");
    return { status: "applied" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
