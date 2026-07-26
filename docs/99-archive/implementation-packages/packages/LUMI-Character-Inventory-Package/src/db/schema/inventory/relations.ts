import { relations } from "drizzle-orm";
import { characters } from "../character/characters";
import { itemDefinitions } from "./item-definitions";
import { itemInstances } from "./item-instances";
import { inventories } from "./inventories";
import { inventoryEntries } from "./inventory-entries";
import { itemHistory } from "./item-history";

export const itemDefinitionsRelations = relations(itemDefinitions, ({ many }) => ({
  instances: many(itemInstances),
}));

export const itemInstancesRelations = relations(itemInstances, ({ one, many }) => ({
  definition: one(itemDefinitions, {
    fields: [itemInstances.itemDefinitionId],
    references: [itemDefinitions.id],
  }),
  history: many(itemHistory),
}));

export const inventoriesRelations = relations(inventories, ({ one, many }) => ({
  ownerCharacter: one(characters, {
    fields: [inventories.ownerCharacterId],
    references: [characters.id],
  }),
  entries: many(inventoryEntries),
}));
