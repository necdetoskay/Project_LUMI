import { integer, jsonb, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { inventoryItemDefinitions } from "./inventory-item-definitions";

export const inventoryItemInstances = profileSchema.table(
  "inventory_item_instances",
  {
    id: primaryId(),
    itemDefinitionId: uuid("item_definition_id")
      .notNull()
      .references(() => inventoryItemDefinitions.id, { onDelete: "restrict" }),
    householdId: uuid("household_id").notNull(),
    instanceName: varchar("instance_name", { length: 200 }),
    lifecycleStatus: varchar("lifecycle_status", { length: 20 }).notNull().default("active"),
    conditionStatus: varchar("condition_status", { length: 20 }).notNull().default("pristine"),
    durabilityCurrent: real("durability_current"),
    durabilityMax: real("durability_max"),
    quantity: integer("quantity").notNull().default(1),
    customProperties: jsonb("custom_properties").notNull().default({}),
    originType: varchar("origin_type", { length: 20 }).notNull(),
    originId: uuid("origin_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
    ...timestampColumns,
    version: integer("version").notNull().default(1),
  },
  () => ({
    defIdx: sql`CREATE INDEX IF NOT EXISTS inv_item_inst_def_idx ON ${profileSchema}.inventory_item_instances (item_definition_id)`,
    lifecycleIdx: sql`CREATE INDEX IF NOT EXISTS inv_item_inst_lifecycle_idx ON ${profileSchema}.inventory_item_instances (lifecycle_status)`,
    householdIdx: sql`CREATE INDEX IF NOT EXISTS inv_item_inst_household_idx ON ${profileSchema}.inventory_item_instances (household_id)`,
  }),
);

export type InventoryItemInstanceRecord = typeof inventoryItemInstances.$inferSelect;
export type NewInventoryItemInstanceRecord = typeof inventoryItemInstances.$inferInsert;


