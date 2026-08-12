import { describe, expect, it } from "vitest";

import {
  reconcileStoryVisualExtraction,
  type StoryVisualExtraction,
} from "../../src/domain";

function baseExtraction(): StoryVisualExtraction {
  return {
    schemaVersion: 1,
    storyId: "story-visual-extraction-1",
    source: "story-generation",
    entities: [],
    sceneBindings: [],
    storyIllustrations: [],
  };
}

describe("story visual extraction reconciliation", () => {
  it("keeps same-category item instances distinct", () => {
    const result = reconcileStoryVisualExtraction({
      ...baseExtraction(),
      entities: [
        {
          manifestEntityId: "old-compass",
          kind: "item",
          category: "compass",
          displayName: "Old Brass Compass",
          identityTraits: ["old brass frame", "scratched glass"],
          requestedStateIds: ["closed", "open"],
          importance: "critical",
          reusable: true,
          sceneIds: ["scene-1"],
        },
        {
          manifestEntityId: "modern-compass",
          kind: "item",
          category: "compass",
          displayName: "Modern Plastic Compass",
          identityTraits: ["black plastic body", "clean acrylic cover"],
          requestedStateIds: ["open"],
          importance: "important",
          reusable: true,
          sceneIds: ["scene-1"],
        },
      ],
    });

    expect(result.manifest.entities).toHaveLength(2);
    expect(result.manifest.entities[0]?.identity.entityId).not.toBe(
      result.manifest.entities[1]?.identity.entityId,
    );
  });

  it("accepts only registry-backed item states and warns about rejected LLM states", () => {
    const result = reconcileStoryVisualExtraction({
      ...baseExtraction(),
      entities: [
        {
          manifestEntityId: "potion-a",
          kind: "item",
          category: "potion",
          displayName: "Moon Potion",
          identityTraits: ["blue glass bottle"],
          requestedStateIds: ["full", "broken", "empty"],
          importance: "critical",
          reusable: true,
          sceneIds: ["scene-2"],
        },
      ],
    });

    expect(
      result.manifest.entities[0]?.requiredStates.map((state) => state.id),
    ).toEqual(["full", "empty"]);
    expect(result.warnings).toContain(
      "STORY_VISUAL_STATE_REJECTED:potion:broken",
    );
  });

  it("falls back to the registry state set when every proposed state is invalid", () => {
    const result = reconcileStoryVisualExtraction({
      ...baseExtraction(),
      entities: [
        {
          manifestEntityId: "bag-a",
          kind: "item",
          category: "bag",
          displayName: "Travel Bag",
          identityTraits: ["green canvas"],
          requestedStateIds: ["exploded"],
          importance: "important",
          reusable: true,
          sceneIds: ["scene-1"],
        },
      ],
    });

    expect(
      result.manifest.entities[0]?.requiredStates.map((state) => state.id),
    ).toEqual(["closed", "open"]);
    expect(result.warnings).toContain("STORY_VISUAL_STATE_FALLBACK:bag");
  });

  it("preserves character outfit variants without creating item states", () => {
    const result = reconcileStoryVisualExtraction({
      ...baseExtraction(),
      source: "backfill",
      entities: [
        {
          manifestEntityId: "mira",
          canonicalRef: "character-mira",
          kind: "character",
          category: "child",
          displayName: "Mira",
          identityTraits: ["same face", "same hair"],
          variants: [
            {
              id: "desert-light",
              kind: "outfit",
              label: "Desert light",
              traits: ["light clothes", "sun hat"],
            },
            {
              id: "mountain-winter",
              kind: "outfit",
              label: "Mountain winter",
              traits: ["thick coat", "warm boots"],
            },
          ],
          requestedStateIds: ["open"],
          importance: "critical",
          reusable: true,
          sceneIds: ["scene-1", "scene-2"],
        },
      ],
    });

    expect(result.manifest.entities[0]?.identity.entityId).toBe(
      "character-mira",
    );
    expect(result.manifest.entities[0]?.variants).toHaveLength(2);
    expect(result.manifest.entities[0]?.requiredStates).toEqual([]);
  });
});
