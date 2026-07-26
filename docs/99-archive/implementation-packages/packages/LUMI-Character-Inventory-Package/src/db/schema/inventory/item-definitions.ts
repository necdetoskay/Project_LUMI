import { boolean, index, jsonb, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { inventorySchema } from "../schemas";
import { assets } from "../media/assets";

export const itemDefinitions = inventorySchema.table(
  "item_definitions",
  {
    id: primaryId(),
    code: varchar("code", { length: 100 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    itemType: varchar("item_type", { length: 60 }).notNull(),
    iconAssetId: uuid("icon_asset_id").references(() => assets.id, { onDelete: "set null" }),
    isStackable: boolean("is_stackable").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("item_definitions_code_unique").on(table.code),
    index("item_definitions_type_idx").on(table.itemType),
  ],
);
