import { describe, expect, it } from "vitest";

import { createInventoryGenesisManifest } from "../domain";
import {
  findInventoryGenesisContextItem,
  projectInventoryGenesisForContext,
} from "./inventory-genesis-context-projection";

describe("Inventory Genesis context projection", () => {
  it("retrieves item provenance independently for context assembly", () => {
    const manifest = createInventoryGenesisManifest({
      characterId: "character-mira",
      seed: "context-seed",
      suggestions: [
        {
          key: "toma_spoon",
          displayName: "Toma's Wooden Spoon",
          description: "A simple wooden spoon from the bakery.",
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
            rationale: "A grounded reminder of the character's bond with Toma.",
          },
        },
      ],
    });

    const projection = projectInventoryGenesisForContext(manifest);
    const definitionKey = manifest.items[0]!.definition.definitionKey;
    const item = findInventoryGenesisContextItem(projection, definitionKey);

    expect(item).toMatchObject({
      definitionKey,
      displayName: "Toma's Wooden Spoon",
      provenance: {
        givenByNpcId: "npc-toma",
        originFactIds: ["fact-bakery"],
        emotionalValue: "high",
      },
    });
  });
});
