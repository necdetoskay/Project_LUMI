import { check, index, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { inventorySchema } from "../schemas";
import { characters } from "../character/characters";
import { worlds } from "../world/worlds";

export const inventories = inventorySchema.table(
  "inventories",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
    ownerCharacterId: uuid("owner_character_id").references(() => characters.id, { onDelete: "cascade" }),
    inventoryType: varchar("inventory_type", { length: 40 }).notNull().default("personal"),
    name: varchar("name", { length: 160 }).notNull(),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("inventories_owner_type_unique").on(table.ownerCharacterId, table.inventoryType),
    index("inventories_world_idx").on(table.worldId),
    check("inventories_type_check", sql`${table.inventoryType} IN ('personal','shared','storage','quest')`),
  ],
);
