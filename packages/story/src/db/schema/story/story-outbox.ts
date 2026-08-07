import {
  check,
  index,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const OUTBOX_STATUSES = [
  "pending",
  "processing",
  "applied",
  "failed",
] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const OUTBOX_INTENT_TYPES = [
  "npc_rumor_spread",
  "npc_relationship_shift",
  "location_reputation_change",
  "environment_ripple",
  "community_awareness",
  "scheduled_effect_enqueue",
  "story_hook_delivery",
  "quest_seed_automation",
  "quest_reward_grant",
] as const;
export type OutboxIntentType = (typeof OUTBOX_INTENT_TYPES)[number];

/**
 * Indirect-effect outbox. One row = one derived (indirect) effect intent that
 * must be propagated exactly once. Enqueued atomically with the commit that
 * produced it (SOWS-014), then claimed+applied by the propagation processor.
 */
export const storyOutbox = storySchema.table(
  "story_outbox",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    worldId: uuid("world_id").notNull(),
    /** Correlation to the commit that produced this indirect intent. */
    commitId: uuid("commit_id").notNull(),
    /** Idempotency key: propagation never applies the same intent twice. */
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    intentType: varchar("intent_type", { length: 60 }).notNull(),
    /** Derived indirect effect payload (bounded, from concrete events only). */
    payload: jsonb("payload").notNull().default({}),
    /** Evidence ref to the source event/commit. */
    evidenceRef: varchar("evidence_ref", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    attemptCount: varchar("attempt_count", { length: 20 })
      .notNull()
      .default("0"),
    lastError: varchar("last_error", { length: 400 }),
    appliedAt: timestamp("applied_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_outbox_pending_idx").on(
      table.householdId,
      table.status,
      table.createdAt,
    ),
    index("story_outbox_commit_idx").on(table.commitId),
    index("story_outbox_idempotency_idx").on(
      table.householdId,
      table.idempotencyKey,
    ),
    check(
      "story_outbox_status_check",
      sql`${table.status} IN ('pending', 'processing', 'applied', 'failed')`,
    ),
  ],
);

export type StoryOutboxRecord = typeof storyOutbox.$inferSelect;
export type NewStoryOutboxRecord = typeof storyOutbox.$inferInsert;
