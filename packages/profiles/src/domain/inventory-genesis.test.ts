import { describe, expect, it } from "vitest";

import {
  createInventoryGenesisManifest,
  getInventoryGenesisProvenance,
  validateInventoryGenesisManifest,
  type InventoryGenesisItemSuggestion,
} from "./inventory-genesis";

const suggestions: InventoryGenesisItemSuggestion[] = [
  {
    key: "field_notebook",
    displayName: "Field Notebook",
    description: "A worn notebook used for ordinary observations.",
    category: "book",
    itemType: "persistent",
    rarity: "common",
    definitionMetadata: {},
    originType: "generated",
    provenance: {
      role: "ordinary",
      originFactIds: ["fact-forest"],
      givenByNpcId: null,
      acquiredAt: "home",
      emotionalValue: "low",
      storyPotential: "low",
      rationale: "Used during regular walks.",
    },
  },
  {
    key: "string_pouch",
    displayName: "Small String Pouch",
    description: "A plain pouch for carrying little finds.",
    category: "collectible",
    itemType: "persistent",
    rarity: "common",
    definitionMetadata: {},
    originType: "generated",
    provenance: {
      role: "ordinary",
      originFactIds: [],
      givenByNpcId: null,
      acquiredAt: "home",
      emotionalValue: "low",
      storyPotential: "low",
      rationale: "A practical everyday possession.",
    },
  },
  {
    key: "toma_spoon",
    displayName: "Toma's Wooden Spoon",
    description: "A simple wooden spoon given after helping at the bakery.",
    category: "gift",
    itemType: "persistent",
    rarity: "common",
    definitionMetadata: { fromCharacter: "npc-toma" },
    originType: "gifted",
    provenance: {
      role: "relationship",
      originFactIds: ["fact-bakery"],
      givenByNpcId: "npc-toma",
      acquiredAt: "bakery",
      emotionalValue: "high",
      storyPotential: "medium",
      rationale: "Connects the character to Toma without being magical.",
    },
  },
];

describe("Inventory Genesis canonical manifest", () => {
  it("creates deterministic canonical inventory inputs", () => {
    const first = createInventoryGenesisManifest({
      characterId: "character-mira",
      seed: "seed-1",
      suggestions,
    });
    const second = createInventoryGenesisManifest({
      characterId: "character-mira",
      seed: "seed-1",
      suggestions,
    });

    expect(first).toEqual(second);
    expect(first.ownerType).toBe("character");
    expect(first.items).toHaveLength(3);
    expect(first.items[0]?.definition.allowedOwnerTypes).toEqual(["character"]);
    expect(first.items[0]?.instance.customProperties).toMatchObject({
      inventoryGenesisRevision: "inventory-genesis.v1",
    });
  });

  it("validates origin and social provenance against canonical ids", () => {
    const manifest = createInventoryGenesisManifest({
      characterId: "character-mira",
      seed: "seed-2",
      suggestions,
    });
    const issues = validateInventoryGenesisManifest({
      manifest,
      originFactIds: ["fact-forest", "fact-bakery"],
      socialNpcIds: ["npc-toma"],
    });

    expect(issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("rejects missing relationship provenance and unbounded-power items", () => {
    const manifest = createInventoryGenesisManifest({
      characterId: "character-mira",
      seed: "seed-3",
      suggestions: [
        ...suggestions.slice(0, 2),
        {
          ...suggestions[2]!,
          displayName: "Infinite Key",
          description: "A key that opens every door.",
          provenance: {
            ...suggestions[2]!.provenance,
            givenByNpcId: "missing-npc",
          },
        },
      ],
    });
    const codes = validateInventoryGenesisManifest({
      manifest,
      originFactIds: ["fact-forest", "fact-bakery"],
      socialNpcIds: [],
    }).map((issue) => issue.code);

    expect(codes).toContain("INVENTORY_GENESIS_GIVER_MISSING");
    expect(codes).toContain("INVENTORY_GENESIS_POWER_GUARD");
  });

  it("retrieves item provenance independently", () => {
    const manifest = createInventoryGenesisManifest({
      characterId: "character-mira",
      seed: "seed-4",
      suggestions,
    });
    const key = manifest.items[2]!.definition.definitionKey;

    expect(getInventoryGenesisProvenance(manifest, key)).toMatchObject({
      role: "relationship",
      givenByNpcId: "npc-toma",
      emotionalValue: "high",
    });
  });
});
