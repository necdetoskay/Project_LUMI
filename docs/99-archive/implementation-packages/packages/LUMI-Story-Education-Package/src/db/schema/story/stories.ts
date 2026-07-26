import { check, index, jsonb, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, softDeleteColumn, timestampColumns } from "../common";
import { storySchema } from "../schemas";
import { worlds } from "../world/worlds";
import { childProfiles } from "../profile/child-profiles";

export type StoryMetadata = {
  themes?: string[];
  ageBands?: string[];
  tags?: string[];
  educationalGoals?: string[];
};

export const stories = storySchema.table(
  "stories",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
    childProfileId: uuid("child_profile_id").references(() => childProfiles.id, { onDelete: "set null" }),
    title: varchar("title", { length: 240 }).notNull(),
    slug: varchar("slug", { length: 240 }).notNull(),
    storyType: varchar("story_type", { length: 40 }).notNull().default("interactive"),
    status: varchar("status", { length: 40 }).notNull().default("draft"),
    metadata: jsonb("metadata").$type<StoryMetadata>().notNull().default({}),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    uniqueIndex("stories_world_slug_unique_active")
      .on(table.worldId, table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    index("stories_world_idx").on(table.worldId),
    index("stories_child_profile_idx").on(table.childProfileId),
    check("stories_type_check", sql`${table.storyType} IN ('static','interactive','continuation')`),
    check("stories_status_check", sql`${table.status} IN ('draft','ready','active','archived')`),
  ],
);

export type StoryRecord = typeof stories.$inferSelect;
export type NewStoryRecord = typeof stories.$inferInsert;
