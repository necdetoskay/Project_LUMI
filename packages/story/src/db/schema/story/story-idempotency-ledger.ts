import { index, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storyIdempotencyLedger = storySchema.table(
  "story_idempotency_ledger",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    storySessionId: uuid("story_session_id"),
    operationType: varchar("operation_type", { length: 60 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_idempotency_scope_idx").on(
      table.householdId,
      table.operationType,
      table.idempotencyKey,
    ),
  ],
);

export type StoryIdempotencyLedgerRecord =
  typeof storyIdempotencyLedger.$inferSelect;
export type NewStoryIdempotencyLedgerRecord =
  typeof storyIdempotencyLedger.$inferInsert;
