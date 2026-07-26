import { check, index, jsonb, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, softDeleteColumn, timestampColumns } from "../common";
import { inventorySchema } from "../schemas";
import { itemDefinitions } from "./item-definitions";
import { worlds } from "../world/worlds";

export const itemInstances = inventorySchema.table(
  "item_instances",
  {
    id: primaryId(),
    itemDefinitionId: uuid("item_definition_id").notNull().references(() => itemDefinitions.id, { onDelete: "restrict" }),
    worldId: uuid("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
    state: varchar("state", { length: 40 }).notNull().default("available"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    index("item_instances_definition_idx").on(table.itemDefinitionId),
    index("item_instances_world_idx").on(table.worldId),
    check("item_instances_state_check", sql`${table.state} IN ('available','equipped','consumed','lost','destroyed')`),
  ],
);
