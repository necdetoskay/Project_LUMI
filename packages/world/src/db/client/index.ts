import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as worldSchema from "../schema/world";

export type Database = ReturnType<typeof createDatabase>;

let dbInstance: Database | undefined;

export function createDatabase(connectionString: string) {
  const queryClient = postgres(connectionString, { max: 5 });
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
