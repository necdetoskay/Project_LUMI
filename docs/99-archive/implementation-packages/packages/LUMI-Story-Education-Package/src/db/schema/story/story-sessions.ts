import { check, index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { storySchema } from "../schemas";
import { storyVersions } from "./story-versions";
import { childProfiles } from "../profile/child-profiles";
import { locations } from "../world/locations";

export const storySessions = storySchema.table(
  "story_sessions",
  {
    id: primaryId(),
    storyVersionId: uuid("story_version_id").notNull().references(() => storyVersions.id, { onDelete: "restrict" }),
    childProfileId: uuid("child_profile_id").notNull().references(() => childProfiles.id, { onDelete: "restrict" }),
    currentLocationId: uuid("current_location_id").references(() => locations.id, { onDelete: "set null" }),
    currentNodeKey: varchar("current_node_key", { length: 120 }),
    status: varchar("status", { length: 40 }).notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    state: jsonb("state").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    index("story_sessions_child_idx").on(table.childProfileId),
    index("story_sessions_version_idx").on(table.storyVersionId),
    index("story_sessions_status_idx").on(table.status),
    check("story_sessions_status_check", sql`${table.status} IN ('active','paused','completed','abandoned')`),
  ],
);

export type StorySessionRecord = typeof storySessions.$inferSelect;
export type NewStorySessionRecord = typeof storySessions.$inferInsert;
