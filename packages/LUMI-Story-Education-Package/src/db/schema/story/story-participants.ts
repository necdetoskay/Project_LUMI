import { index, jsonb, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";
import { storySchema } from "../schemas";
import { storySessions } from "./story-sessions";
import { characters } from "../character/characters";

export const storyParticipants = storySchema.table(
  "story_participants",
  {
    storySessionId: uuid("story_session_id").notNull().references(() => storySessions.id, { onDelete: "cascade" }),
    characterId: uuid("character_id").notNull().references(() => characters.id, { onDelete: "restrict" }),
    participationRole: varchar("participation_role", { length: 60 }).notNull().default("participant"),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    primaryKey({ columns: [table.storySessionId, table.characterId], name: "story_participants_pk" }),
    index("story_participants_character_idx").on(table.characterId),
  ],
);
