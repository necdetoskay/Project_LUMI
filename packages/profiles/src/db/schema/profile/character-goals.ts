import { index, integer, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { lumiCharacters } from "./lumi-characters";

export const characterGoals = profileSchema.table(
  "character_goals",
  {
    id: primaryId(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    needType: varchar("need_type", { length: 40 }).notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    priority: integer("priority").notNull().default(1),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    ...timestampColumns,
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    charIdx: index("character_goals_char_idx").on(table.characterId, table.status),
  }),
);

export type CharacterGoalRecord = typeof characterGoals.$inferSelect;
export type NewCharacterGoalRecord = typeof characterGoals.$inferInsert;
