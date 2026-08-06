import {
  check,
  index,
  integer,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storyCommitRecords = storySchema.table(
  "story_commit_records",
  {
    id: primaryId(),
    manifestId: uuid("manifest_id").notNull(),
    storySessionId: uuid("story_session_id").notNull(),
    householdId: uuid("household_id").notNull(),
    worldId: uuid("world_id").notNull(),
    /** World version BEFORE this commit (append-only trace). */
    worldVersionBefore: integer("world_version_before").notNull(),
    /** World version AFTER this commit (bumped by 1). */
    worldVersionAfter: integer("world_version_after").notNull(),
    /** Deterministic world state hash after applying the commit. */
    worldStateHash: varchar("world_state_hash", { length: 128 }).notNull(),
    /** The resolved world changes committed in this transaction. */
    changes: jsonb("changes").notNull().default([]),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("committed"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_commit_manifest_idx").on(table.manifestId),
    index("story_commit_session_idx").on(table.storySessionId, table.createdAt),
    index("story_commit_household_idx").on(table.householdId),
    index("story_commit_idempotency_idx").on(
      table.householdId,
      table.idempotencyKey,
    ),
    check(
      "story_commit_version_after_gt_before",
      sql`${table.worldVersionAfter} > ${table.worldVersionBefore}`,
    ),
    check(
      "story_commit_status_check",
      sql`${table.status} IN ('committed', 'compensated')`,
    ),
  ],
);

export type StoryCommitRecord = typeof storyCommitRecords.$inferSelect;
export type NewStoryCommitRecord = typeof storyCommitRecords.$inferInsert;
