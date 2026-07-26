import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../config/env";
import * as schema from "./schema";

const queryClient = postgres(env.DATABASE_URL, {
  max: env.DATABASE_MAX_CONNECTIONS,
  idle_timeout: env.DATABASE_IDLE_TIMEOUT_SECONDS,
  connect_timeout: env.DATABASE_CONNECT_TIMEOUT_SECONDS,
  prepare: false,
  onnotice: env.DB_LOGGING
    ? (notice) => console.info("[postgres notice]", notice)
    : undefined,
  debug: env.DB_LOGGING
    ? (_connection, query, parameters) => {
        console.debug("[postgres query]", query, parameters);
      }
    : undefined,
});

export const db = drizzle(queryClient, {
  schema,
  logger: env.DB_LOGGING,
});

export type Database = typeof db;

export async function closeDatabase(): Promise<void> {
  await queryClient.end({ timeout: 5 });
}
