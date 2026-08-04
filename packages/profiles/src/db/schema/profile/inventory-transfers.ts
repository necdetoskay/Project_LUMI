import { timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "../common";
import { profileSchema } from "../schemas";
import { inventoryItemInstances } from "./inventory-item-instances";

export const inventoryTransfers = profileSchema.table(
  "inventory_transfers",
  {
    id: primaryId(),
    actorHouseholdId: uuid("actor_household_id").notNull(),
    itemInstanceId: uuid("item_instance_id")
      .notNull()
      .references(() => inventoryItemInstances.id, { onDelete: "restrict" }),
    fromOwnerType: varchar("from_owner_type", { length: 40 }).notNull(),
    fromOwnerId: uuid("from_owner_id").notNull(),
    toOwnerType: varchar("to_owner_type", { length: 40 }).notNull(),
    toOwnerId: uuid("to_owner_id").notNull(),
    transferType: varchar("transfer_type", { length: 40 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    reason: varchar("reason", { length: 500 }),
    sourceType: varchar("source_type", { length: 40 }).notNull(),
    sourceId: uuid("source_id"),
    idempotencyKey: varchar("idempotency_key", { length: 200 }),
    failureReason: varchar("failure_reason", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    committedAt: timestamp("committed_at", {
      withTimezone: true,
      mode: "date",
    }),
    failedAt: timestamp("failed_at", { withTimezone: true, mode: "date" }),
  },
  () => ({
    itemIdx: sql`CREATE INDEX IF NOT EXISTS inv_transfer_item_idx ON ${profileSchema}.inventory_transfers (item_instance_id, created_at DESC)`,
    idempKey: sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_inv_transfer_household_item_type_key ON ${profileSchema}.inventory_transfers (actor_household_id, item_instance_id, transfer_type, idempotency_key) WHERE idempotency_key IS NOT NULL`,
  }),
);

export type InventoryTransferRecord = typeof inventoryTransfers.$inferSelect;
export type NewInventoryTransferRecord = typeof inventoryTransfers.$inferInsert;
