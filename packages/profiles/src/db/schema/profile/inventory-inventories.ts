import { boolean, integer, jsonb, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";

export const inventoryInventories = profileSchema.table(
  "inventory_inventories",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    ownerType: varchar("owner_type", { length: 40 }).notNull(),
    ownerId: uuid("owner_id").notNull(),
    inventoryType: varchar("inventory_type", { length: 40 }).notNull().default("personal"),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    capacityMode: varchar("capacity_mode", { length: 20 }).notNull().default("unlimited"),
    capacityValue: integer("capacity_value"),
    isLocked: boolean("is_locked").notNull().default(false),
    lifecycleStatus: varchar("lifecycle_status", { length: 20 }).notNull().default("active"),
    metadata: jsonb("metadata").notNull().default({}),
    ...timestampColumns,
    version: integer("version").notNull().default(1),
  },
  () => ({
    ownerIdx: sql`CREATE INDEX IF NOT EXISTS inv_inv_owner_idx ON ${profileSchema}.inventory_inventories (owner_type, owner_id)`,
    householdIdx: sql`CREATE INDEX IF NOT EXISTS inv_inv_household_idx ON ${profileSchema}.inventory_inventories (household_id)`,
  }),
);

export type InventoryRecord = typeof inventoryInventories.$inferSelect;
export type NewInventoryRecord = typeof inventoryInventories.$inferInsert;


