import { Pool } from "pg";

import { serverEnvironment } from "@/lib/env";

let pool: Pool | undefined;

export function getAuthPool() {
  pool ??= new Pool({
    connectionString: serverEnvironment.DATABASE_URL,
    max: 5,
  });

  return pool;
}

export async function closeAuthPool() {
  if (!pool) {
    return;
  }

  const activePool = pool;
  pool = undefined;
  await activePool.end();
}
