import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { env } from "../config/env";

async function main(): Promise<void> {
  const migrationClient = postgres(env.DATABASE_URL, {
    max: 1,
    prepare: false,
  });

  try {
    const migrationDb = drizzle(migrationClient);

    await migrate(migrationDb, {
      migrationsFolder: "./drizzle",
      migrationsSchema: "system",
      migrationsTable: "__drizzle_migrations",
    });

    console.info("Database migrations completed successfully.");
  } catch (error) {
    console.error("Database migration failed.", error);
    process.exitCode = 1;
  } finally {
    await migrationClient.end({ timeout: 5 });
  }
}

void main();
