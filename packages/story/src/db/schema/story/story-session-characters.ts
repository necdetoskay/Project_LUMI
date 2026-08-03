import { check, index, integer, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storySchema } from "./schemas";

export const storySessionCharacters = storySchema.table(
  "story_session_characters",
  {
    storySessionId: uuid("story_session_id").notNull(),
    characterId: uuid("character_id").notNull(),
    participationRole: varchar("participation_role", { length: 20 }).notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    initialStateSnapshot: jsonb("initial_state_snapshot").notNull().default({}),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    index("story_session_characters_session_idx").on(table.storySessionId),
    check(
      "story_session_characters_role_check",
      sql`${table.participationRole} IN ('protagonist', 'companion', 'guide', 'antagonist', 'guest')`,
    ),
  ],
);

export type StorySessionCharacterRecord = typeof storySessionCharacters.$inferSelect;
export type NewStorySessionCharacterRecord = typeof storySessionCharacters.$inferInsert;
