import { check, index, integer, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storyVersions = storySchema.table(
  "story_versions",
  {
    id: primaryId(),
    storyDefinitionId: uuid("story_definition_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    publicationStatus: varchar("publication_status", { length: 20 }).notNull().default("draft"),
    schemaVersion: integer("schema_version").notNull().default(1),
    title: varchar("title", { length: 300 }).notNull(),
    summary: varchar("summary", { length: 2000 }),
    storyMode: varchar("story_mode", { length: 20 }).notNull().default("static"),
    contentHash: varchar("content_hash", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    frozenAt: timestamp("frozen_at", { withTimezone: true, mode: "date" }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    retiredAt: timestamp("retired_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("story_version_definition_idx").on(table.storyDefinitionId, table.versionNumber),
    index("story_version_status_idx").on(table.publicationStatus),
    check(
      "story_version_status_check",
      sql`${table.publicationStatus} IN ('draft', 'frozen', 'published', 'retired')`,
    ),
    check("story_version_positive_check", sql`${table.versionNumber} > 0`),
  ],
);

export type StoryVersionRecord = typeof storyVersions.$inferSelect;
export type NewStoryVersionRecord = typeof storyVersions.$inferInsert;