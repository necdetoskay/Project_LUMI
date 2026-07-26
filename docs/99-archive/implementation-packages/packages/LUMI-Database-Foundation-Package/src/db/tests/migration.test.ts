import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { closeDatabase, db } from "../client";

const expectedSchemas = [
  "identity",
  "profile",
  "world",
  "character",
  "story",
  "simulation",
  "memory",
  "inventory",
  "education",
  "media",
  "ai",
  "audit",
  "system",
] as const;

describe("foundation migration", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it.each(expectedSchemas)(
    "creates %s schema",
    async (schemaName) => {
      const result = await db.execute<{ exists: boolean }>(sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.schemata
          WHERE schema_name = ${schemaName}
        ) AS exists
      `);

      expect(result[0]?.exists).toBe(true);
    },
  );

  it("installs required extensions", async () => {
    const result = await db.execute<{ extname: string }>(sql`
      SELECT extname
      FROM pg_extension
      WHERE extname IN ('pgcrypto', 'citext')
      ORDER BY extname
    `);

    expect(result.map((row) => row.extname)).toEqual([
      "citext",
      "pgcrypto",
    ]);
  });
});
