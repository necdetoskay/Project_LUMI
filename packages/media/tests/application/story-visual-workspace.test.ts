import { describe, expect, it } from "vitest";

import { summarizeStoryVisualWorkspace } from "../../src/application/story-visual-workspace.service";
import type { PersistedStoryVisualManifest } from "../../src/ports/repository.port";

const manifest: PersistedStoryVisualManifest = {
  id: "10000000-0000-4000-8000-000000000001",
  scope: {
    householdId: "10000000-0000-4000-8000-000000000010",
    childProfileId: "10000000-0000-4000-8000-000000000011",
    worldId: "10000000-0000-4000-8000-000000000012",
  },
  storyId: "10000000-0000-4000-8000-000000000020",
  manifestFingerprint: "a".repeat(64),
  createdAt: new Date("2026-08-12T00:00:00.000Z"),
  manifest: {
    schemaVersion: 1,
    storyId: "10000000-0000-4000-8000-000000000020",
    source: "story-generation",
    entities: [
      {
        manifestEntityId: "lina",
        identity: {
          entityId: "character-lina",
          kind: "character",
          category: "human",
          displayName: "Lina",
          identityTraits: ["dark hair"],
        },
        variants: [
          {
            id: "winter",
            kind: "outfit",
            label: "Winter",
            traits: ["red coat"],
          },
          {
            id: "desert",
            kind: "outfit",
            label: "Desert",
            traits: ["sun hat"],
          },
        ],
        requiredStates: [],
        importance: "critical",
        reusable: true,
        sceneIds: ["scene-1"],
      },
      {
        manifestEntityId: "compass",
        identity: {
          entityId: "item-compass",
          kind: "item",
          category: "compass",
          displayName: "Old Brass Compass",
          identityTraits: ["brass"],
        },
        variants: [],
        requiredStates: [
          { id: "closed", label: "Closed" },
          { id: "open", label: "Open" },
        ],
        importance: "important",
        reusable: true,
        sceneIds: ["scene-1"],
      },
      {
        manifestEntityId: "cave",
        identity: {
          entityId: "environment-cave",
          kind: "environment",
          category: "cave",
          displayName: "Crystal Cave",
          identityTraits: ["blue crystals"],
        },
        variants: [],
        requiredStates: [],
        importance: "important",
        reusable: true,
        sceneIds: ["scene-1"],
      },
    ],
    sceneBindings: [],
    storyIllustrations: [
      {
        id: "illustration-1",
        sceneId: "scene-1",
        importance: "critical",
        compositionBrief: "Lina enters the crystal cave.",
      },
    ],
  },
};

describe("story visual workspace summary", () => {
  it("counts concrete entities and render dimensions without collapsing states or variants", () => {
    const result = summarizeStoryVisualWorkspace({
      manifest,
      assetSet: null,
      renders: [
        {
          id: "render-1",
          assetSetId: "asset-set-1",
          targetKind: "entity-render",
          targetId: "lina:winter",
          manifestEntityId: "lina",
          resolvedEntityId: "character-lina",
          variantId: "winter",
          stateId: null,
          renderFingerprint: "b".repeat(64),
          assetId: "10000000-0000-4000-8000-000000000030",
          status: "ready",
          createdAt: new Date("2026-08-12T00:00:00.000Z"),
          updatedAt: new Date("2026-08-12T00:00:00.000Z"),
        },
      ],
    });

    expect(result.counts.characters).toBe(1);
    expect(result.counts.items).toBe(1);
    expect(result.counts.environments).toBe(1);
    expect(result.counts.scenes).toBe(1);
    expect(result.counts.total).toBe(6);
    expect(result.counts.ready).toBe(1);
    expect(result.counts.missing).toBe(5);
    expect(result.requirements).toHaveLength(6);
    expect(
      result.requirements.find(
        (requirement) => requirement.key === "lina:winter:base",
      ),
    ).toMatchObject({ status: "ready", variantLabel: "Winter" });
    expect(
      result.requirements.find(
        (requirement) => requirement.key === "compass:base:open",
      ),
    ).toMatchObject({
      displayName: "Old Brass Compass",
      stateLabel: "Open",
      status: "missing",
    });
  });

  it("does not count a ready status without a bound asset as ready", () => {
    const result = summarizeStoryVisualWorkspace({
      manifest,
      assetSet: null,
      renders: [
        {
          id: "render-2",
          assetSetId: "asset-set-1",
          targetKind: "story-illustration",
          targetId: "illustration-1",
          renderFingerprint: "c".repeat(64),
          assetId: null,
          status: "ready",
          createdAt: new Date("2026-08-12T00:00:00.000Z"),
          updatedAt: new Date("2026-08-12T00:00:00.000Z"),
        },
      ],
    });

    expect(result.counts.ready).toBe(0);
    expect(result.counts.missing).toBe(6);
    expect(
      result.requirements.find(
        (requirement) => requirement.key === "illustration:illustration-1",
      )?.status,
    ).toBe("missing");
  });
});
