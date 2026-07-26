import { index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { inventorySchema } from "../schemas";
import { itemInstances } from "./item-instances";
import { inventories } from "./inventories";

export const itemHistory = inventorySchema.table(
  "item_history",
  {
    id: primaryId(),
    itemInstanceId: uuid("item_instance_id").notNull().references(() => itemInstances.id, { onDelete: "cascade" }),
    fromInventoryId: uuid("from_inventory_id").references(() => inventories.id, { onDelete: "set null" }),
    toInventoryId: uuid("to_inventory_id").references(() => inventories.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 60 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [index("item_history_item_time_idx").on(table.itemInstanceId, table.occurredAt)],
);
