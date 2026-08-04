import {
  check,
  index,
  integer,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storySessionCheckpoints = storySchema.table(
  "story_session_checkpoints",
  {
    id: primaryId(),
    storySessionId: uuid("story_session_id").notNull(),
    sceneId: uuid("scene_id").notNull(),
    checkpointType: varchar("checkpoint_type", { length: 20 }).notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    sessionState: jsonb("session_state").notNull().default({}),
    contentHash: varchar("content_hash", { length: 128 }).notNull(),
    sequenceNumber: integer("sequence_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_session_checkpoint_session_idx").on(
      table.storySessionId,
      table.sequenceNumber,
    ),
    check(
      "story_session_checkpoint_type_check",
      sql`${table.checkpointType} IN ('automatic', 'manual', 'choice', 'chapter', 'recovery')`,
    ),
    check(
      "story_session_checkpoint_sequence_check",
      sql`${table.sequenceNumber} >= 0`,
    ),
  ],
);

export type StorySessionCheckpointRecord =
  typeof storySessionCheckpoints.$inferSelect;
export type NewStorySessionCheckpointRecord =
  typeof storySessionCheckpoints.$inferInsert;
