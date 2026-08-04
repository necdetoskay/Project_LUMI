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

export const storySessionSceneVisits = storySchema.table(
  "story_session_scene_visits",
  {
    id: primaryId(),
    storySessionId: uuid("story_session_id").notNull(),
    sceneId: uuid("scene_id").notNull(),
    visitSequence: integer("visit_sequence").notNull(),
    enteredAt: timestamp("entered_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    visitReason: varchar("visit_reason", { length: 40 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_session_visits_session_idx").on(
      table.storySessionId,
      table.visitSequence,
    ),
    check(
      "story_session_visits_sequence_check",
      sql`${table.visitSequence} >= 0`,
    ),
  ],
);

export type StorySessionSceneVisitRecord =
  typeof storySessionSceneVisits.$inferSelect;
export type NewStorySessionSceneVisitRecord =
  typeof storySessionSceneVisits.$inferInsert;
