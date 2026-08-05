import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as privacySchema from "../schema/privacy";

export type Database = ReturnType<typeof createDatabase>;

let dbInstance: Database | undefined;

export function createDatabase(connectionString: string) {
  const queryClient = postgres(connectionString, { max: 5 });
  return drizzle(queryClient, { schema: privacySchema });
}

export function getDatabase(connectionString: string): Database {
  dbInstance ??= createDatabase(connectionString);
  return dbInstance;
}

export type QueryExecutor = {
  select: Database["select"];
  insert: Database["insert"];
  update: Database["update"];
  delete: Database["delete"];
  transaction: Database["transaction"];
};
