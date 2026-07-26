import { sql } from "drizzle-orm";
import { db } from "../client";

export type DatabaseHealth = {
  status: "ok" | "degraded";
  databaseTime?: Date;
  latencyMs: number;
  error?: string;
};

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startedAt = Date.now();

  try {
    const result = await db.execute(sql`
      SELECT NOW() AS database_time
    `);

    const row = result.rows[0] as {
      database_time?: string | Date;
    } | undefined;

    return {
      status: "ok",
      databaseTime: row?.database_time
        ? new Date(row.database_time)
        : undefined,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      status: "degraded",
      latencyMs: Date.now() - startedAt,
      error:
        error instanceof Error
          ? error.message
          : "Unknown database error",
    };
  }
}
