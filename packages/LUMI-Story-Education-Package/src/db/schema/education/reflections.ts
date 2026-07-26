import { index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { educationSchema } from "../schemas";
import { storySessions } from "../story/story-sessions";
import { childProfiles } from "../profile/child-profiles";

export const reflections = educationSchema.table(
  "reflections",
  {
    id: primaryId(),
    storySessionId: uuid("story_session_id").notNull().references(() => storySessions.id, { onDelete: "cascade" }),
    childProfileId: uuid("child_profile_id").notNull().references(() => childProfiles.id, { onDelete: "restrict" }),
    reflectionType: varchar("reflection_type", { length: 60 }).notNull().default("post_story"),
    text: varchar("text", { length: 4000 }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("reflections_session_idx").on(table.storySessionId),
    index("reflections_child_idx").on(table.childProfileId),
  ],
);
