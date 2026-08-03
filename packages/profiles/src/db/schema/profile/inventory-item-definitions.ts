import { boolean, integer, jsonb, real, text, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { sql } from "drizzle-orm";

export const inventoryItemDefinitions = profileSchema.table(
  "inventory_item_definitions",
  {
    id: primaryId(),
    definitionKey: varchar("definition_key", { length: 120 }).notNull().unique(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 40 }).notNull(),
    itemType: varchar("item_type", { length: 40 }).notNull(),
    rarity: varchar("rarity", { length: 40 }).notNull(),
    stackMode: varchar("stack_mode", { length: 40 }).notNull(),
    maxStackSize: integer("max_stack_size"),
    durabilityMode: varchar("durability_mode", { length: 40 }).notNull(),
    defaultDurability: real("default_durability"),
    isTransferable: boolean("is_transferable").notNull().default(true),
    isEquippable: boolean("is_equippable").notNull().default(false),
    isConsumable: boolean("is_consumable").notNull().default(false),
    isStorySelectable: boolean("is_story_selectable").notNull().default(false),
    allowedOwnerTypes: jsonb("allowed_owner_types").notNull().default(sql`'["character"]'`),
    lifecycleStatus: varchar("lifecycle_status", { length: 20 }).notNull().default("active"),
    metadata: jsonb("metadata").notNull().default({}),
    ...timestampColumns,
    version: integer("version").notNull().default(1),
  },
  () => ({
    lifecycleIdx: sql`CREATE INDEX IF NOT EXISTS inv_item_def_lifecycle_idx ON ${profileSchema}.inventory_item_definitions (lifecycle_status)`,
  }),
);

export type InventoryItemDefinitionRecord = typeof inventoryItemDefinitions.$inferSelect;
export type NewInventoryItemDefinitionRecord = typeof inventoryItemDefinitions.$inferInsert;


