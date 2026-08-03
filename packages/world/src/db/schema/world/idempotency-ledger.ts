import { jsonb, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { profileSchema } from "./schemas";

export const worldIdempotencyLedger = profileSchema.table(
  "world_idempotency_ledger",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    worldId: uuid("world_id"),
    operationType: varchar("operation_type", { length: 60 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    resultPayload: jsonb("result_payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    uqIdempotencyScope: uniqueIndex("uq_idempotency_scope").on(
      table.householdId,
      table.worldId,
      table.operationType,
      table.idempotencyKey,
    ),
  }),
);

export type WorldIdempotencyLedgerRecord = typeof worldIdempotencyLedger.$inferSelect;
export type NewWorldIdempotencyLedgerRecord = typeof worldIdempotencyLedger.$inferInsert;
