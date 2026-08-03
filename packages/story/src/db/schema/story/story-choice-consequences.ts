import { check, index, integer, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storyChoiceConsequences = storySchema.table(
  "story_choice_consequences",
  {
    id: primaryId(),
    storySessionId: uuid("story_session_id").notNull(),
    committedChoiceId: uuid("committed_choice_id").notNull(),
    consequenceType: varchar("consequence_type", { length: 30 }).notNull(),
    targetKey: varchar("target_key", { length: 120 }),
    payload: jsonb("payload").notNull().default({}),
    sequenceNumber: integer("sequence_number").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("story_choice_consequence_session_idx").on(table.storySessionId),
    index("story_choice_consequence_choice_idx").on(table.committedChoiceId),
    check(
      "story_choice_consequence_type_check",
      sql`${table.consequenceType} IN ('scene_transition', 'state_update', 'flag_set', 'flag_remove', 'score_delta', 'outcome_candidate')`,
    ),
    check("story_choice_consequence_sequence_non_negative_check", sql`${table.sequenceNumber} >= 0`),
  ],
);

export type StoryChoiceConsequenceRecord = typeof storyChoiceConsequences.$inferSelect;
export type NewStoryChoiceConsequenceRecord = typeof storyChoiceConsequences.$inferInsert;
