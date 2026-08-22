import { describe, expect, it } from "vitest";

import {
  reconcileStoryVisualExtraction,
  type StoryVisualExtraction,
} from "../../src/domain";

const SCENE_1 = "10000000-0000-4000-8000-000000000001";
const SCENE_2 = "10000000-0000-4000-8000-000000000002";
const sceneIds = new Map([
  ["scene-1", SCENE_1],
  ["scene-2", SCENE_2],
]);

function resolveSceneId(sourceRef: string): string | undefined {
  return sceneIds.get(sourceRef);
}

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
    const result = reconcileStoryVisualExtraction(
      {
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
      },
      resolveSceneId,
    );

    expect(result.manifest.entities).toHaveLength(2);
    expect(result.manifest.entities[0]?.identity.entityId).not.toBe(
      result.manifest.entities[1]?.identity.entityId,
    );
  });

  it("accepts only registry-backed item states and warns about rejected LLM states", () => {
    const result = reconcileStoryVisualExtraction(
      {
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
      },
      resolveSceneId,
    );

    expect(
      result.manifest.entities[0]?.requiredStates.map((state) => state.id),
    ).toEqual(["full", "empty"]);
    expect(result.warnings).toContain(
      "STORY_VISUAL_STATE_REJECTED:potion:broken",
    );
  });

  it("falls back to the registry state set when every proposed state is invalid", () => {
    const result = reconcileStoryVisualExtraction(
      {
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
      },
      resolveSceneId,
    );

    expect(
      result.manifest.entities[0]?.requiredStates.map((state) => state.id),
    ).toEqual(["closed", "open"]);
    expect(result.warnings).toContain("STORY_VISUAL_STATE_FALLBACK:bag");
  });

  it("preserves character outfit variants without creating item states", () => {
    const result = reconcileStoryVisualExtraction(
      {
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
      },
      resolveSceneId,
    );

    expect(result.manifest.entities[0]?.identity.entityId).toBe(
      "character-mira",
    );
    expect(result.manifest.entities[0]?.variants).toHaveLength(2);
    expect(result.manifest.entities[0]?.requiredStates).toEqual([]);
    expect(result.manifest.entities[0]?.sceneIds).toEqual([SCENE_1, SCENE_2]);
  });

  it("canonicalizes entity, binding, and illustration scene references", () => {
    const result = reconcileStoryVisualExtraction(
      {
        ...baseExtraction(),
        entities: [
          {
            manifestEntityId: "mira",
            kind: "character",
            category: "child",
            displayName: "Mira",
            identityTraits: ["canonical Mira"],
            importance: "critical",
            reusable: true,
            sceneIds: ["scene-1"],
          },
        ],
        sceneBindings: [
          {
            sceneId: "scene-1",
            usages: [{ manifestEntityId: "mira", role: "primary" }],
          },
        ],
        storyIllustrations: [
          {
            id: "illustration-1",
            sceneId: "scene-1",
            importance: "critical",
            compositionBrief: "Mira enters the library",
          },
        ],
      },
      resolveSceneId,
    );

    expect(result.manifest.entities[0]?.sceneIds).toEqual([SCENE_1]);
    expect(result.manifest.sceneBindings[0]?.sceneId).toBe(SCENE_1);
    expect(result.manifest.storyIllustrations[0]?.sceneId).toBe(SCENE_1);
  });

  it("fails closed when a scene reference cannot be resolved", () => {
    expect(() =>
      reconcileStoryVisualExtraction(
        {
          ...baseExtraction(),
          storyIllustrations: [
            {
              id: "illustration-missing",
              sceneId: "missing-scene",
              importance: "critical",
              compositionBrief: "Unknown scene",
            },
          ],
        },
        resolveSceneId,
      ),
    ).toThrow("STORY_VISUAL_SCENE_REFERENCE_UNRESOLVED:missing-scene");
  });

  it("rejects a resolver result that is not a canonical persisted UUID", () => {
    expect(() =>
      reconcileStoryVisualExtraction(
        {
          ...baseExtraction(),
          entities: [
            {
              manifestEntityId: "mira",
              kind: "character",
              category: "child",
              displayName: "Mira",
              identityTraits: ["canonical Mira"],
              importance: "critical",
              reusable: true,
              sceneIds: ["scene-1"],
            },
          ],
        },
        (sourceRef) => sourceRef,
      ),
    ).toThrow("STORY_VISUAL_CANONICAL_SCENE_ID_REQUIRED:scene-1");
  });
});
