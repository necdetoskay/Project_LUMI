import { check, index, integer, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "./common";
import { storySchema } from "./schemas";

export const storyDefinitions = storySchema.table(
  "story_definitions",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    childProfileId: uuid("child_profile_id"),
    title: varchar("title", { length: 300 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    storyType: varchar("story_type", { length: 40 }).notNull(),
    sourceType: varchar("source_type", { length: 40 }).notNull(),
    lifecycle: varchar("lifecycle", { length: 20 }).notNull().default("draft"),
    currentPublishedVersionId: uuid("current_published_version_id"),
    ageGroup: varchar("age_group", { length: 40 }).notNull(),
    defaultLanguage: varchar("default_language", { length: 10 }).notNull(),
    version: integer("version").notNull().default(1),
    ...timestampColumns,
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("story_def_household_idx").on(table.householdId),
    index("story_def_child_idx").on(table.childProfileId),
    index("story_def_lifecycle_idx").on(table.lifecycle),
    index("story_def_slug_idx").on(table.householdId, table.slug),
    check(
      "story_def_lifecycle_check",
      sql`${table.lifecycle} IN ('draft', 'review', 'published', 'retired', 'archived')`,
    ),
  ],
);

export type StoryDefinitionRecord = typeof storyDefinitions.$inferSelect;
export type NewStoryDefinitionRecord = typeof storyDefinitions.$inferInsert;