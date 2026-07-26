import { check, index, jsonb, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { characterSchema } from "../schemas";
import { characters } from "./characters";

export const characterConditions = characterSchema.table(
  "character_conditions",
  {
    id: primaryId(),
    characterId: uuid("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
    conditionCode: varchar("condition_code", { length: 100 }).notNull(),
    severity: real("severity").notNull().default(0.5),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    index("character_conditions_character_idx").on(table.characterId),
    check("character_conditions_severity_check", sql`${table.severity} BETWEEN 0 AND 1`),
  ],
);
