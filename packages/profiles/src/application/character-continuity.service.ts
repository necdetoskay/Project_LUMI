import { and, eq } from "drizzle-orm";

import { getProfileDb } from "./db";
import { DrizzleCharacterDomainRepository } from "../db/repositories/drizzle/drizzle-character-domain.repository";
import { DrizzleCharacterRepository } from "../db/repositories/drizzle/drizzle-character.repository";
import { DrizzleInventoryRepository } from "../db/repositories/drizzle/drizzle-inventory.repository";
import {
  inventoryEntries,
  inventoryItemDefinitions,
  inventoryItemInstances,
} from "../db/schema/profile";

const MAX_TRAITS = 6;
const MAX_RELATIONSHIPS = 4;
const MAX_INVENTORY_ITEMS = 5;

export interface CharacterContinuitySnapshot {
  characterId: string;
  childProfileId: string;
  householdId: string;
  name: string;
  version: number;
  traits: Array<{ dimension: string; value: number }>;
  relationships: Array<{
    targetCharacterId: string;
    relationshipType: string;
    trust: number;
    affinity: number;
    familiarity: number;
  }>;
  inventory: Array<{
    itemInstanceId: string;
    displayName: string;
    category: string;
    rarity: string;
    quantity: number;
  }>;
}

/**
 * Internal story-composition read model. It deliberately requires all three
 * scope identifiers and never widens beyond the supplied household/child.
 * The returned shape is bounded and prompt-safe; callers do not receive ORM
 * records or arbitrary metadata.
 */
export async function getCharacterContinuitySnapshot(
  householdId: string,
  childProfileId: string,
  characterId: string,
): Promise<CharacterContinuitySnapshot | null> {
  const db = getProfileDb();
  const characterRepo = new DrizzleCharacterRepository(db);
  const domainRepo = new DrizzleCharacterDomainRepository(db);
  const inventoryRepo = new DrizzleInventoryRepository(db);

  const character = await characterRepo.findById(characterId, householdId);
  if (!character || character.childProfileId !== childProfileId) return null;

  const [traitRows, relationshipRows] = await Promise.all([
    domainRepo.getTraitStates(characterId),
    domainRepo.getRelationships(characterId),
  ]);

  const traits = traitRows
    .map((row) => ({ dimension: row.dimension, value: row.value }))
    .sort((a, b) => a.dimension.localeCompare(b.dimension))
    .slice(0, MAX_TRAITS);

  const relationships = relationshipRows
    .map((row) => ({
      targetCharacterId: row.targetCharacterId,
      relationshipType: row.relationshipType,
      trust: row.trust,
      affinity: row.affinity,
      familiarity: row.familiarity,
    }))
    .sort((a, b) => a.targetCharacterId.localeCompare(b.targetCharacterId))
    .slice(0, MAX_RELATIONSHIPS);

  const inventory: CharacterContinuitySnapshot["inventory"] = [];
  const personalInventory = await inventoryRepo.findInventoryByOwner(
    "character",
    characterId,
    "personal",
    householdId,
  );

  if (personalInventory) {
    const rows = await db
      .select({
        itemInstanceId: inventoryItemInstances.id,
        displayName: inventoryItemDefinitions.displayName,
        category: inventoryItemDefinitions.category,
        rarity: inventoryItemDefinitions.rarity,
        quantity: inventoryEntries.quantity,
      })
      .from(inventoryEntries)
      .innerJoin(
        inventoryItemInstances,
        eq(inventoryEntries.itemInstanceId, inventoryItemInstances.id),
      )
      .innerJoin(
        inventoryItemDefinitions,
        eq(
          inventoryItemInstances.itemDefinitionId,
          inventoryItemDefinitions.id,
        ),
      )
      .where(
        and(
          eq(inventoryEntries.inventoryId, personalInventory.id),
          eq(inventoryEntries.entryStatus, "active"),
          eq(inventoryItemInstances.lifecycleStatus, "active"),
          eq(inventoryItemDefinitions.lifecycleStatus, "active"),
          eq(inventoryItemDefinitions.isStorySelectable, true),
        ),
      )
      .limit(MAX_INVENTORY_ITEMS);

    inventory.push(...rows);
  }

  return {
    characterId: character.id,
    childProfileId: character.childProfileId,
    householdId: character.householdId,
    name: character.name,
    version: character.version ?? 1,
    traits,
    relationships,
    inventory,
  };
}
