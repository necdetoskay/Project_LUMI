import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as worldSchema from "../schema/world";

const DEFAULT_DATABASE_POOL_MAX = 5;

export type Database = ReturnType<typeof createDatabase>;

let dbInstance: Database | undefined;

function getDatabasePoolMax(): number {
  const configured = Number.parseInt(
    process.env.DATABASE_POOL_MAX ?? String(DEFAULT_DATABASE_POOL_MAX),
    10,
  );
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_DATABASE_POOL_MAX;
}

export function createDatabase(connectionString: string) {
  const queryClient = postgres(connectionString, { max: getDatabasePoolMax() });
  return drizzle(queryClient, { schema: worldSchema });
}

export function getDatabase(connectionString: string): Database {
  dbInstance ??= createDatabase(connectionString);
  return dbInstance;
}

let _worldDb: Database | undefined;

export function getWorldDb(): Database {
  if (_worldDb) return _worldDb;
  const url =
    process.env.DATABASE_URL ??
    "postgresql://lumi:lumi_local_only@localhost:15432/lumi";
  _worldDb = createDatabase(url);
  return _worldDb;
}

export type QueryExecutor = {
  select: Database["select"];
  insert: Database["insert"];
  update: Database["update"];
  delete: Database["delete"];
  transaction: Database["transaction"];
};
