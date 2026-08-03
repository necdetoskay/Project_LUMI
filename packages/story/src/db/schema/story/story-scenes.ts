import { boolean, check, index, integer, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storyScenes = storySchema.table(
  "story_scenes",
  {
    id: primaryId(),
    storyVersionId: uuid("story_version_id").notNull(),
    sceneKey: varchar("scene_key", { length: 120 }).notNull(),
    sequenceNumber: integer("sequence_number").notNull().default(0),
    sceneType: varchar("scene_type", { length: 20 }).notNull(),
    title: varchar("title", { length: 300 }),
    narrativeText: varchar("narrative_text", { length: 8000 }).notNull(),
    isEntryScene: boolean("is_entry_scene").notNull().default(false),
    isTerminalScene: boolean("is_terminal_scene").notNull().default(false),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("story_scene_version_idx").on(table.storyVersionId, table.sequenceNumber),
    index("story_scene_key_idx").on(table.storyVersionId, table.sceneKey),
    check(
      "story_scene_type_check",
      sql`${table.sceneType} IN ('narrative', 'choice', 'transition', 'challenge', 'ending', 'reflection', 'system')`,
    ),
    check("story_scene_sequence_check", sql`${table.sequenceNumber} >= 0`),
  ],
);

export type StorySceneRecord = typeof storyScenes.$inferSelect;
export type NewStorySceneRecord = typeof storyScenes.$inferInsert;
