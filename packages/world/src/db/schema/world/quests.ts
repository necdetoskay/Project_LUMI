import {
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "./common";
import { profileSchema } from "./schemas";

export const quests = profileSchema.table(
  "quests",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    worldId: uuid("world_id").notNull(),
    storySessionId: uuid("story_session_id"),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    reward: jsonb("reward"),
    status: varchar("status", { length: 20 }).notNull().default("inactive"),
    version: integer("version").notNull().default(1),
    evidenceRef: text("evidence_ref"),
    ...timestampColumns,
  },
  (table) => [
    index("quest_household_idx").on(table.householdId),
    index("quest_world_idx").on(table.worldId),
    index("quest_session_idx").on(table.storySessionId),
  ],
);

export type QuestRecord = typeof quests.$inferSelect;
export type NewQuestRecord = typeof quests.$inferInsert;

export const questObjectives = profileSchema.table(
  "quest_objectives",
  {
    id: primaryId(),
    questId: uuid("quest_id").notNull(),
    objectiveIndex: integer("objective_index").notNull(),
    title: text("title").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("locked"),
    evidenceRef: text("evidence_ref"),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    uniqueIndex("uq_quest_objective").on(table.questId, table.objectiveIndex),
    index("quest_objective_quest_idx").on(table.questId),
  ],
);

export type QuestObjectiveRecord = typeof questObjectives.$inferSelect;
export type NewQuestObjectiveRecord = typeof questObjectives.$inferInsert;
