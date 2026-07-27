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

import { profileSchema } from "../schemas";
import { households } from "./households";

export type ParentalSafetyMetadata = {
  blockedTopics?: string[];
  customNotes?: string[];
};

export const parentalSettings = profileSchema.table(
  "parental_settings",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    maxDailyStories: integer("max_daily_stories").notNull().default(3),
    contentBoundary: varchar("content_boundary", { length: 20 })
      .notNull()
      .default("strict"),
    timeLimitMinutes: integer("time_limit_minutes"),
    requireParentApprovalForAi: boolean(
      "require_parent_approval_for_ai",
    ).notNull().default(false),
    allowImageGeneration: boolean("allow_image_generation")
      .notNull()
      .default(true),
    allowTts: boolean("allow_tts").notNull().default(true),
    safetyMetadata: jsonb("safety_metadata")
      .$type<ParentalSafetyMetadata>()
      .notNull()
      .default({}),
  },
  (table) => [
    primaryKey({
      columns: [table.householdId],
      name: "parental_settings_pk",
    }),
    check(
      "parental_settings_daily_limit_check",
      sql`${table.maxDailyStories} BETWEEN 0 AND 50`,
    ),
    check(
      "parental_settings_content_boundary_check",
      sql`${table.contentBoundary} IN ('strict', 'moderate', 'open')`,
    ),
  ],
);

export type ParentalSettingRecord = typeof parentalSettings.$inferSelect;
export type NewParentalSettingRecord = typeof parentalSettings.$inferInsert;
