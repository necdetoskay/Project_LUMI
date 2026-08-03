import { check, index, integer, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "./common";
import { storySchema } from "./schemas";

export const storySessions = storySchema.table(
  "story_sessions",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    childProfileId: uuid("child_profile_id").notNull(),
    worldId: uuid("world_id").notNull(),
    storyDefinitionId: uuid("story_definition_id").notNull(),
    storyVersionId: uuid("story_version_id").notNull(),
    currentSceneId: uuid("current_scene_id"),
    sessionStatus: varchar("session_status", { length: 20 }).notNull().default("created"),
    playbackMode: varchar("playback_mode", { length: 20 }).notNull().default("reading"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    lastInteractedAt: timestamp("last_interacted_at", { withTimezone: true, mode: "date" }),
    pausedAt: timestamp("paused_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    abandonmentReason: varchar("abandonment_reason", { length: 500 }),
    contextSnapshot: jsonb("context_snapshot").notNull().default({}),
    version: integer("version").notNull().default(1),
    ...timestampColumns,
  },
  (table) => [
    index("story_session_child_status_idx").on(table.childProfileId, table.sessionStatus),
    index("story_session_world_idx").on(table.worldId),
    index("story_session_version_idx").on(table.storyVersionId),
    index("story_session_last_interacted_idx").on(table.lastInteractedAt),
    check(
      "story_session_status_check",
      sql`${table.sessionStatus} IN ('created', 'active', 'paused', 'completed', 'abandoned', 'failed')`,
    ),
    check(
      "story_session_playback_mode_check",
      sql`${table.playbackMode} IN ('reading', 'narrated', 'mixed')`,
    ),
    check("story_session_version_positive_check", sql`${table.version} >= 1`),
  ],
);

export type StorySessionRecord = typeof storySessions.$inferSelect;
export type NewStorySessionRecord = typeof storySessions.$inferInsert;
