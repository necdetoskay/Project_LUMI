import { check, index, integer, primaryKey, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { inventorySchema } from "../schemas";
import { inventories } from "./inventories";
import { itemInstances } from "./item-instances";

export const inventoryEntries = inventorySchema.table(
  "inventory_entries",
  {
    inventoryId: uuid("inventory_id").notNull().references(() => inventories.id, { onDelete: "cascade" }),
    itemInstanceId: uuid("item_instance_id").notNull().references(() => itemInstances.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    addedAt: timestamp("added_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.inventoryId, table.itemInstanceId], name: "inventory_entries_pk" }),
    uniqueIndex("inventory_entries_item_unique").on(table.itemInstanceId),
    index("inventory_entries_inventory_idx").on(table.inventoryId),
    check("inventory_entries_quantity_check", sql`${table.quantity} > 0`),
  ],
);
