import { sql } from "drizzle-orm";
import { db } from "../client";

export const REQUIRED_SCHEMAS = [
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

export async function checkRequiredSchemas(): Promise<{
  existing: string[];
  missing: string[];
}> {
  const result = await db.execute(sql`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name = ANY(
      ARRAY[
        'identity',
        'profile',
        'world',
        'character',
        'story',
        'simulation',
        'memory',
        'inventory',
        'education',
        'media',
        'ai',
        'audit',
        'system'
      ]
    )
  `);

  const existing = result.rows.map(
    (row) => String(row.schema_name),
  );

  return {
    existing,
    missing: REQUIRED_SCHEMAS.filter(
      (schema) => !existing.includes(schema),
    ),
  };
}
