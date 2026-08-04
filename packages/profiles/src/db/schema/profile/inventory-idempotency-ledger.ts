import { jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "../common";
import { profileSchema } from "../schemas";

export const inventoryIdempotencyLedger = profileSchema.table(
  "inventory_idempotency_ledger",
  {
    id: primaryId(),
    idempotencyKey: varchar("idempotency_key", { length: 200 }).notNull(),
    operationType: varchar("operation_type", { length: 40 }).notNull(),
    itemInstanceId: uuid("item_instance_id").notNull(),
    actorHouseholdId: uuid("actor_household_id").notNull(),
    resultStatus: varchar("result_status", { length: 20 })
      .notNull()
      .default("completed"),
    resultPayload: jsonb("result_payload"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  () => ({
    itemOpIdx: sql`CREATE INDEX IF NOT EXISTS inv_idempotency_item_idx ON ${profileSchema}.inventory_idempotency_ledger (item_instance_id, operation_type)`,
    scopedKeyIdx: sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_inv_idempotency_household_operation_key ON ${profileSchema}.inventory_idempotency_ledger (actor_household_id, operation_type, idempotency_key)`,
  }),
);

export type InventoryIdempotencyLedgerRecord =
  typeof inventoryIdempotencyLedger.$inferSelect;
export type NewInventoryIdempotencyLedgerRecord =
  typeof inventoryIdempotencyLedger.$inferInsert;
