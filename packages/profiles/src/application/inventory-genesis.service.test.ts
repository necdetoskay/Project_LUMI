import { describe, expect, it } from "vitest";

import {
  validateInventoryGenesisSuggestion,
  type InventoryGenesisSuggestion,
} from "./inventory-genesis.service";

function baseSuggestion(): InventoryGenesisSuggestion {
  return {
    key: "inventory-1",
    title: "Grounded starting possessions",
    items: [
      {
        key: "notebook",
        displayName: "Field Notebook",
        description: "A worn notebook for everyday observations.",
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
          rationale: "Used during ordinary walks.",
        },
      },
      {
        key: "pouch",
        displayName: "Small Pouch",
        description: "A plain pouch for little finds.",
        category: "collectible",
        itemType: "persistent",
        rarity: "common",
        definitionMetadata: {},
        originType: "generated",
        provenance: {
          role: "personality",
          originFactIds: [],
          givenByNpcId: null,
          acquiredAt: "home",
          emotionalValue: "medium",
          storyPotential: "low",
          rationale: "Fits a curious collector without creating a quest hook.",
        },
      },
      {
        key: "spoon",
        displayName: "Toma's Wooden Spoon",
        description: "A simple gift from the bakery.",
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
          rationale: "A grounded reminder of Toma.",
        },
      },
    ],
  };
}

describe("Inventory Genesis semantic validation", () => {
  it("accepts a small grounded inventory", () => {
    const validation = validateInventoryGenesisSuggestion(baseSuggestion());
    expect(validation.valid).toBe(true);
    expect(validation.itemCount).toBe(3);
  });

  it("requires a canonical Social Genesis giver for relationship items", () => {
    const suggestion = baseSuggestion();
    suggestion.items[2]!.provenance.givenByNpcId = null;

    const validation = validateInventoryGenesisSuggestion(suggestion);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      "INVENTORY_GENESIS_RELATIONSHIP_GIVER_REQUIRED",
    );
  });

  it("requires origin evidence for legacy items", () => {
    const suggestion = baseSuggestion();
    suggestion.items[2]!.provenance = {
      ...suggestion.items[2]!.provenance,
      role: "legacy",
      givenByNpcId: null,
      originFactIds: [],
    };

    const validation = validateInventoryGenesisSuggestion(suggestion);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      "INVENTORY_GENESIS_LEGACY_FACT_REQUIRED",
    );
  });

  it("warns when rarity and story hooks dominate the starting inventory", () => {
    const suggestion = baseSuggestion();
    suggestion.items[0]!.rarity = "rare";
    suggestion.items[1]!.rarity = "unique";
    suggestion.items[0]!.provenance.storyPotential = "high";
    suggestion.items[1]!.provenance.storyPotential = "high";

    const codes = validateInventoryGenesisSuggestion(suggestion).issues.map(
      (issue) => issue.code,
    );
    expect(codes).toContain("INVENTORY_GENESIS_RARITY_OVERLOAD");
    expect(codes).toContain("INVENTORY_GENESIS_STORY_HOOK_OVERLOAD");
  });
});
