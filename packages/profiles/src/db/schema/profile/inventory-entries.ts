import { integer, jsonb, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { inventoryInventories } from "./inventory-inventories";
import { inventoryItemInstances } from "./inventory-item-instances";

export const inventoryEntries = profileSchema.table(
  "inventory_entries",
  {
    id: primaryId(),
    inventoryId: uuid("inventory_id")
      .notNull()
      .references(() => inventoryInventories.id, { onDelete: "cascade" }),
    itemInstanceId: uuid("item_instance_id")
      .notNull()
      .references(() => inventoryItemInstances.id, { onDelete: "restrict" }),
    slotKey: varchar("slot_key", { length: 80 }),
    sortOrder: integer("sort_order").notNull().default(0),
    quantity: integer("quantity").notNull().default(1),
    entryStatus: varchar("entry_status", { length: 20 })
      .notNull()
      .default("active"),
    metadata: jsonb("metadata").notNull().default({}),
    ...timestampColumns,
  },
  () => ({
    invIdx: sql`CREATE INDEX IF NOT EXISTS inv_entry_inv_idx ON ${profileSchema}.inventory_entries (inventory_id, entry_status, sort_order)`,
    instanceIdx: sql`CREATE INDEX IF NOT EXISTS inv_entry_instance_idx ON ${profileSchema}.inventory_entries (item_instance_id, entry_status)`,
    uqEntry: sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_inv_entry_inv_instance ON ${profileSchema}.inventory_entries (inventory_id, item_instance_id)`,
  }),
);

export type InventoryEntryRecord = typeof inventoryEntries.$inferSelect;
export type NewInventoryEntryRecord = typeof inventoryEntries.$inferInsert;
