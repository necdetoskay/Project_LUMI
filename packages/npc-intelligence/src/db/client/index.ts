import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as npcIntelligenceSchema from "../schema/npc-intelligence";

export type Database = ReturnType<typeof createDatabase>;

let dbInstance: Database | undefined;

export function createDatabase(connectionString: string) {
  const queryClient = postgres(connectionString, { max: 5 });
  return drizzle(queryClient, { schema: npcIntelligenceSchema });
}

export function getDatabase(connectionString: string): Database {
  dbInstance ??= createDatabase(connectionString);
  return dbInstance;
}

let _npcDb: Database | undefined;

export function getNpcDb(): Database {
  if (_npcDb) return _npcDb;
  const url =
    process.env.DATABASE_URL ??
    "postgresql://lumi:lumi_local_only@localhost:15432/lumi";
  _npcDb = createDatabase(url);
  return _npcDb;
}

export type QueryExecutor = {
  select: Database["select"];
  insert: Database["insert"];
  update: Database["update"];
  delete: Database["delete"];
  transaction: Database["transaction"];
};
