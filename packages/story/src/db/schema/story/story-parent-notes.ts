import { index, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storyParentNotes = storySchema.table(
  "story_parent_notes",
  {
    id: primaryId(),
    storySessionId: uuid("story_session_id").notNull(),
    noteType: varchar("note_type", { length: 40 }).notNull(),
    placeholder: varchar("placeholder", { length: 1000 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("story_parent_notes_session_idx").on(table.storySessionId),
    index("story_parent_notes_type_idx").on(table.noteType),
  ],
);

export type StoryParentNoteRecord = typeof storyParentNotes.$inferSelect;
export type NewStoryParentNoteRecord = typeof storyParentNotes.$inferInsert;
