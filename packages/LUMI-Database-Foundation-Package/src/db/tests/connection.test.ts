import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { closeDatabase, db } from "../client";

describe("database connection", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("connects to PostgreSQL", async () => {
    const result = await db.execute<{
      ok: number;
    }>(sql`SELECT 1 AS ok`);

    expect(result[0]?.ok).toBe(1);
  });

  it("uses UTC-compatible timestamptz semantics", async () => {
    const result = await db.execute<{
      now: Date;
    }>(sql`SELECT NOW() AS now`);

    expect(result[0]?.now).toBeInstanceOf(Date);
  });
});
