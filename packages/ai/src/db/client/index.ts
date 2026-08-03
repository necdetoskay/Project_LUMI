import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as aiSchema from "../schema/ai";

export type Database = ReturnType<typeof createDatabase>;

let dbInstance: Database | undefined;

export function createDatabase(connectionString: string) {
  const queryClient = postgres(connectionString, { max: 5 });
  return drizzle(queryClient, { schema: aiSchema });
}

export function getDatabase(connectionString: string): Database {
  dbInstance ??= createDatabase(connectionString);
  return dbInstance;
}

let _aiDb: Database | undefined;

export function getAiDb(): Database {
  if (_aiDb) return _aiDb;
  const url =
    process.env.DATABASE_URL ??
    "postgresql://lumi:lumi_local_only@localhost:15432/lumi";
  _aiDb = createDatabase(url);
  return _aiDb;
}

export type QueryExecutor = {
  select: Database["select"];
  insert: Database["insert"];
  update: Database["update"];
  delete: Database["delete"];
  transaction: Database["transaction"];
};
