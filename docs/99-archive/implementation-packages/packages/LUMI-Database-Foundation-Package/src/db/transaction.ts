import type { ExtractTablesWithRelations } from "drizzle-orm";
import type {
  PostgresJsDatabase,
  PostgresJsQueryResultHKT,
} from "drizzle-orm/postgres-js";
import type { PgTransaction } from "drizzle-orm/pg-core";

import { db } from "./client";
import * as schema from "./schema";

export type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export type TransactionExecutor = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type QueryExecutor = DatabaseExecutor | TransactionExecutor;

export async function withTransaction<T>(
  callback: (tx: TransactionExecutor) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => callback(tx));
}

export async function withSerializableTransaction<T>(
  callback: (tx: TransactionExecutor) => Promise<T>,
): Promise<T> {
  return db.transaction(
    async (tx) => callback(tx),
    {
      isolationLevel: "serializable",
      accessMode: "read write",
      deferrable: false,
    },
  );
}
