import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as simulationSchema from "../schema/simulation";

export type Database = ReturnType<typeof createDatabase>;

let dbInstance: Database | undefined;

export function createDatabase(connectionString: string) {
  const queryClient = postgres(connectionString, { max: 5 });
  return drizzle(queryClient, { schema: simulationSchema });
}

export function getDatabase(connectionString: string): Database {
  dbInstance ??= createDatabase(connectionString);
  return dbInstance;
}

let _simulationDb: Database | undefined;

export function getSimulationDb(): Database {
  if (_simulationDb) return _simulationDb;
  const url =
    process.env.DATABASE_URL ??
    "postgresql://lumi:lumi_local_only@localhost:15432/lumi";
  _simulationDb = createDatabase(url);
  return _simulationDb;
}

export type QueryExecutor = {
  select: Database["select"];
  insert: Database["insert"];
  update: Database["update"];
  delete: Database["delete"];
  transaction: Database["transaction"];
};
