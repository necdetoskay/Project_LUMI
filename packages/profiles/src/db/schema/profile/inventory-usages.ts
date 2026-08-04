import { integer, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "../common";
import { profileSchema } from "../schemas";
import { inventoryItemInstances } from "./inventory-item-instances";

export const inventoryUsages = profileSchema.table(
  "inventory_usages",
  {
    id: primaryId(),
    itemInstanceId: uuid("item_instance_id")
      .notNull()
      .references(() => inventoryItemInstances.id, { onDelete: "restrict" }),
    usedByOwnerType: varchar("used_by_owner_type", { length: 40 }).notNull(),
    usedByOwnerId: uuid("used_by_owner_id").notNull(),
    usageType: varchar("usage_type", { length: 40 }).notNull(),
    usageContext: varchar("usage_context", { length: 1000 }),
    quantityUsed: integer("quantity_used").notNull().default(1),
    validationStatus: varchar("validation_status", { length: 20 })
      .notNull()
      .default("valid"),
    applicationStatus: varchar("application_status", { length: 20 })
      .notNull()
      .default("applied"),
    idempotencyKey: varchar("idempotency_key", { length: 200 }),
    actorHouseholdId: uuid("actor_household_id").notNull(),
    actorUserId: uuid("actor_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  () => ({
    itemIdx: sql`CREATE INDEX IF NOT EXISTS inv_usage_item_idx ON ${profileSchema}.inventory_usages (item_instance_id, created_at DESC)`,
  }),
);

export type InventoryUsageRecord = typeof inventoryUsages.$inferSelect;
export type NewInventoryUsageRecord = typeof inventoryUsages.$inferInsert;
