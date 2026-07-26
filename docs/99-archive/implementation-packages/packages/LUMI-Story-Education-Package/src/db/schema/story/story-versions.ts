import { index, integer, jsonb, text, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { storySchema } from "../schemas";
import { stories } from "./stories";

export type StoryVersionContent = {
  opening?: string;
  sections?: Array<Record<string, unknown>>;
  ending?: string;
};

export const storyVersions = storySchema.table(
  "story_versions",
  {
    id: primaryId(),
    storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    contentSchemaVersion: varchar("content_schema_version", { length: 40 }).notNull().default("1.0"),
    content: jsonb("content").$type<StoryVersionContent>().notNull(),
    summary: text("summary"),
    createdByModel: varchar("created_by_model", { length: 160 }),
    createdAt: new (require("drizzle-orm/pg-core").timestamp)("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("story_versions_story_version_unique").on(table.storyId, table.versionNumber),
    index("story_versions_story_idx").on(table.storyId),
  ],
);
