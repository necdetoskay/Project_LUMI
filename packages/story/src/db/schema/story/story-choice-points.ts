import { check, index, integer, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storyChoicePoints = storySchema.table(
  "story_choice_points",
  {
    id: primaryId(),
    storyVersionId: uuid("story_version_id").notNull(),
    sceneId: uuid("scene_id").notNull(),
    choicePointKey: varchar("choice_point_key", { length: 120 }).notNull(),
    choicePointType: varchar("choice_point_type", { length: 20 }).notNull(),
    promptText: varchar("prompt_text", { length: 2000 }).notNull(),
    sequenceNumber: integer("sequence_number").notNull().default(0),
    ruleVersion: integer("rule_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("story_choice_point_version_idx").on(table.storyVersionId),
    index("story_choice_point_scene_idx").on(table.sceneId),
    check(
      "story_choice_point_type_check",
      sql`${table.choicePointType} IN ('single', 'multiple', 'timed', 'hidden', 'conditional')`,
    ),
    check("story_choice_point_rule_version_positive_check", sql`${table.ruleVersion} >= 1`),
  ],
);

export type StoryChoicePointRecord = typeof storyChoicePoints.$inferSelect;
export type NewStoryChoicePointRecord = typeof storyChoicePoints.$inferInsert;
