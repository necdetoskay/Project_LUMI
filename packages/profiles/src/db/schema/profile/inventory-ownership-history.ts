import { timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "../common";
import { profileSchema } from "../schemas";
import { inventoryItemInstances } from "./inventory-item-instances";

export const inventoryOwnershipHistory = profileSchema.table(
  "inventory_ownership_history",
  {
    id: primaryId(),
    itemInstanceId: uuid("item_instance_id")
      .notNull()
      .references(() => inventoryItemInstances.id, { onDelete: "restrict" }),
    fromOwnerType: varchar("from_owner_type", { length: 40 }),
    fromOwnerId: uuid("from_owner_id"),
    toOwnerType: varchar("to_owner_type", { length: 40 }).notNull(),
    toOwnerId: uuid("to_owner_id").notNull(),
    ownershipType: varchar("ownership_type", { length: 20 }).notNull(),
    transferType: varchar("transfer_type", { length: 40 }).notNull(),
    reason: varchar("reason", { length: 500 }),
    idempotencyKey: varchar("idempotency_key", { length: 200 }),
    actorHouseholdId: uuid("actor_household_id").notNull(),
    actorUserId: uuid("actor_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  () => ({
    itemIdx: sql`CREATE INDEX IF NOT EXISTS inv_own_hist_item_idx ON ${profileSchema}.inventory_ownership_history (item_instance_id, created_at DESC)`,
  }),
);

export type InventoryOwnershipHistoryRecord =
  typeof inventoryOwnershipHistory.$inferSelect;
export type NewInventoryOwnershipHistoryRecord =
  typeof inventoryOwnershipHistory.$inferInsert;
