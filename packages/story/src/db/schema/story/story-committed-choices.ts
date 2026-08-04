import { check, index, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storyCommittedChoices = storySchema.table(
  "story_committed_choices",
  {
    id: primaryId(),
    storySessionId: uuid("story_session_id").notNull(),
    choicePointId: uuid("choice_point_id").notNull(),
    optionId: uuid("option_id").notNull(),
    evidenceSceneId: uuid("evidence_scene_id").notNull(),
    ruleVersion: integer("rule_version").notNull().default(1),
    actorUserId: uuid("actor_user_id"),
    committedAt: timestamp("committed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_committed_choice_session_idx").on(table.storySessionId),
    index("story_committed_choice_point_idx").on(table.choicePointId),
    check(
      "story_committed_choice_rule_version_positive_check",
      sql`${table.ruleVersion} >= 1`,
    ),
  ],
);

export type StoryCommittedChoiceRecord =
  typeof storyCommittedChoices.$inferSelect;
export type NewStoryCommittedChoiceRecord =
  typeof storyCommittedChoices.$inferInsert;
