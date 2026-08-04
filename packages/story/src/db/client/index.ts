import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as storySchema from "../schema/story";

export type Database = ReturnType<typeof createDatabase>;

let dbInstance: Database | undefined;

export function createDatabase(connectionString: string) {
  const queryClient = postgres(connectionString, { max: 5 });
  return drizzle(queryClient, { schema: storySchema });
}

export function getDatabase(connectionString: string): Database {
  dbInstance ??= createDatabase(connectionString);
  return dbInstance;
}

let _storyDb: Database | undefined;

export function getStoryDb(): Database {
  if (_storyDb) return _storyDb;
  const url =
    process.env.DATABASE_URL ??
    "postgresql://lumi:lumi_local_only@localhost:15432/lumi";
  _storyDb = createDatabase(url);
  return _storyDb;
}

export type QueryExecutor = {
  select: Database["select"];
  insert: Database["insert"];
  update: Database["update"];
  delete: Database["delete"];
  transaction: Database["transaction"];
};
