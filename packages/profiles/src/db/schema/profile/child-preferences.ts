import {
  boolean,
  check,
  integer,
  jsonb,
  primaryKey,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type { StoryPreferenceMetadata } from "../../../domain/types";
import { profileSchema } from "../schemas";
import { childProfiles } from "./child-profiles";

export const childPreferences = profileSchema.table(
  "child_preferences",
  {
    childProfileId: uuid("child_profile_id")
      .notNull()
      .references(() => childProfiles.id, { onDelete: "cascade" }),
    storyLength: varchar("story_length", { length: 20 })
      .notNull()
      .default("medium"),
    interactionLevel: integer("interaction_level").notNull().default(2),
    imageEnabled: boolean("image_enabled").notNull().default(true),
    audioEnabled: boolean("audio_enabled").notNull().default(false),
    metadata: jsonb("metadata")
      .$type<StoryPreferenceMetadata>()
      .notNull()
      .default({}),
  },
  (table) => [
    primaryKey({
      columns: [table.childProfileId],
      name: "child_preferences_pk",
    }),
    check(
      "child_preferences_story_length_check",
      sql`${table.storyLength} IN ('short', 'medium', 'long')`,
    ),
    check(
      "child_preferences_interaction_level_check",
      sql`${table.interactionLevel} BETWEEN 0 AND 5`,
    ),
  ],
);

export type ChildPreferenceRecord = typeof childPreferences.$inferSelect;
export type NewChildPreferenceRecord = typeof childPreferences.$inferInsert;
