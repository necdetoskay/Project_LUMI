import {
  check,
  index,
  integer,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storySceneTransitions = storySchema.table(
  "story_scene_transitions",
  {
    id: primaryId(),
    storyVersionId: uuid("story_version_id").notNull(),
    fromSceneId: uuid("from_scene_id").notNull(),
    toSceneId: uuid("to_scene_id").notNull(),
    transitionType: varchar("transition_type", { length: 20 }).notNull(),
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_transition_version_idx").on(table.storyVersionId),
    index("story_transition_from_idx").on(table.fromSceneId),
    check(
      "story_transition_type_check",
      sql`${table.transitionType} IN ('automatic', 'conditional', 'choice', 'fallback')`,
    ),
  ],
);

export type StorySceneTransitionRecord =
  typeof storySceneTransitions.$inferSelect;
export type NewStorySceneTransitionRecord =
  typeof storySceneTransitions.$inferInsert;
