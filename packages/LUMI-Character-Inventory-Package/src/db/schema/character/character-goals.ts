import { check, index, jsonb, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { characterSchema } from "../schemas";
import { characters } from "./characters";

export const characterGoals = characterSchema.table(
  "character_goals",
  {
    id: primaryId(),
    characterId: uuid("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
    goalCode: varchar("goal_code", { length: 100 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("active"),
    priority: real("priority").notNull().default(0.5),
    dueAt: timestamp("due_at", { withTimezone: true, mode: "date" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    index("character_goals_character_idx").on(table.characterId),
    check("character_goals_priority_check", sql`${table.priority} BETWEEN 0 AND 1`),
    check("character_goals_status_check", sql`${table.status} IN ('active','completed','abandoned','blocked')`),
  ],
);
