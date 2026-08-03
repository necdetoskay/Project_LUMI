import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as promptSchema from "../schema/prompts";

export type Database = ReturnType<typeof createDatabase>;

let dbInstance: Database | undefined;

export function createDatabase(connectionString: string) {
  const queryClient = postgres(connectionString, { max: 5 });
  return drizzle(queryClient, { schema: promptSchema });
}

export function getDatabase(connectionString: string): Database {
  dbInstance ??= createDatabase(connectionString);
  return dbInstance;
}

let _promptDb: Database | undefined;

export function getPromptDb(): Database {
  if (_promptDb) return _promptDb;
  const url = process.env.DATABASE_URL ?? "postgresql://lumi:lumi_local_only@localhost:15432/lumi";
  _promptDb = createDatabase(url);
  return _promptDb;
}

export type QueryExecutor = {
  select: Database["select"];
  insert: Database["insert"];
  update: Database["update"];
  delete: Database["delete"];
  transaction: Database["transaction"];
};
