import type {
  InventoryGenesisManifest,
  InventoryGenesisProvenance,
} from "../domain";

export interface InventoryGenesisContextItem {
  definitionKey: string;
  displayName: string;
  category: string;
  rarity: string;
  storySelectable: boolean;
  provenance: InventoryGenesisProvenance;
}

export interface InventoryGenesisContextProjection {
  ownerType: "character";
  ownerId: string;
  items: InventoryGenesisContextItem[];
  revision: string;
}

/**
 * Produces the inventory fragment consumed by Character State / Context Assembly.
 * The projection is deliberately independent from prompt generation and does not
 * mutate the canonical inventory ledger.
 */
export function projectInventoryGenesisForContext(
  manifest: InventoryGenesisManifest,
): InventoryGenesisContextProjection {
  return {
    ownerType: manifest.ownerType,
    ownerId: manifest.ownerId,
    revision: manifest.derivationRevision,
    items: manifest.items.map((item) => ({
      definitionKey: item.definition.definitionKey,
      displayName: item.definition.displayName,
      category: item.definition.category,
      rarity: item.definition.rarity,
      storySelectable: item.definition.isStorySelectable,
      provenance: structuredClone(item.provenance),
    })),
  };
}

export function findInventoryGenesisContextItem(
  projection: InventoryGenesisContextProjection,
  definitionKey: string,
): InventoryGenesisContextItem | null {
  const item = projection.items.find(
    (candidate) => candidate.definitionKey === definitionKey,
  );
  return item ? structuredClone(item) : null;
}
