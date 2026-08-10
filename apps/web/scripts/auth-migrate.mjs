import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
const __dirname = dirname(fileURLToPath(import.meta.url));
const authSchemaSql = readFileSync(
  resolve(__dirname, "..", "migrations", "0001_auth_schema.sql"),
  "utf-8",
);

if (!databaseUrl) {
  console.error("DATABASE_URL is required to run auth migrations.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query(authSchemaSql);
  console.warn("Auth migration completed.");
} finally {
  await client.end();
}
