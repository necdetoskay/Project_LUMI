import { describe, expect, it } from "vitest";

import {
  computeStoryVisualRenderFingerprint,
  planMissingStoryVisualAssets,
  resolveStoryVisualEntities,
  type ExistingVisualEntity,
  type StoryVisualManifest,
} from "../../src/domain";

function manifestWithCompasses(): StoryVisualManifest {
  return {
    schemaVersion: 1,
    storyId: "story-resolver-1",
    source: "story-generation",
    entities: [
      {
        manifestEntityId: "old-compass",
        identity: {
          entityId: "old-compass",
          kind: "item",
          category: "compass",
          displayName: "Old Brass Compass",
          identityTraits: ["old brass frame", "scratched glass"],
        },
        variants: [],
        requiredStates: [
          { id: "closed", label: "Closed" },
          { id: "open", label: "Open" },
        ],
        importance: "critical",
        reusable: true,
        sceneIds: ["scene-1"],
      },
      {
        manifestEntityId: "modern-compass",
        identity: {
          entityId: "modern-compass",
          kind: "item",
          category: "compass",
          displayName: "Modern Plastic Compass",
          identityTraits: ["black plastic body", "clean acrylic cover"],
        },
        variants: [],
        requiredStates: [{ id: "open", label: "Open" }],
        importance: "important",
        reusable: true,
        sceneIds: ["scene-1"],
      },
    ],
    sceneBindings: [],
    storyIllustrations: [],
  };
}

describe("story visual entity resolution", () => {
  it("never collapses different concrete items just because their category matches", () => {
    const manifest = manifestWithCompasses();
    const existingEntities: ExistingVisualEntity[] = [
      {
        entityId: "unrelated-compass",
        identity: {
          entityId: "unrelated-compass",
          kind: "item",
          category: "compass",
          displayName: "Another Compass",
          identityTraits: ["silver frame", "blue needle"],
        },
      },
    ];

    const resolutions = resolveStoryVisualEntities({
      manifest,
      existingEntities,
    });

    expect(resolutions.map((entry) => entry.source)).toEqual([
      "new-entity",
      "new-entity",
    ]);
    expect(resolutions[0]?.resolvedEntityId).not.toBe(
      resolutions[1]?.resolvedEntityId,
    );
  });

  it("reuses an explicitly referenced canonical entity", () => {
    const manifest = manifestWithCompasses();
    const oldCompass = manifest.entities[0];
    if (!oldCompass) throw new Error("TEST_ENTITY_REQUIRED");

    const canonicalManifest: StoryVisualManifest = {
      ...manifest,
      entities: [
        {
          ...oldCompass,
          identity: {
            ...oldCompass.identity,
            canonicalRef: "world-item-compass-7",
          },
        },
      ],
    };

    const resolutions = resolveStoryVisualEntities({
      manifest: canonicalManifest,
      existingEntities: [
        {
          entityId: "world-item-compass-7",
          identity: {
            ...oldCompass.identity,
            entityId: "world-item-compass-7",
            canonicalRef: "world-item-compass-7",
          },
        },
      ],
    });

    expect(resolutions).toHaveLength(1);
    expect(resolutions[0]?.source).toBe("canonical-ref");
    expect(resolutions[0]?.resolvedEntityId).toBe("world-item-compass-7");
  });
});

describe("missing story visual asset planning", () => {
  it("plans each required state independently and reuses an exact render fingerprint", () => {
    const manifest = manifestWithCompasses();
    const oldCompass = manifest.entities[0];
    if (!oldCompass) throw new Error("TEST_ENTITY_REQUIRED");

    const existingOpenFingerprint = computeStoryVisualRenderFingerprint({
      identity: oldCompass.identity,
      state: { id: "open", label: "Open" },
      styleId: "lumi-storybook",
      styleVersion: 1,
      promptCompilerVersion: "visual-prompt-v1",
    });

    const plan = planMissingStoryVisualAssets({
      manifest,
      existingEntities: [],
      existingRenders: [
        {
          assetId: "asset-old-compass-open",
          renderFingerprint: existingOpenFingerprint,
        },
      ],
      styleId: "lumi-storybook",
      styleVersion: 1,
      promptCompilerVersion: "visual-prompt-v1",
    });

    expect(plan.reusableRenders).toHaveLength(1);
    expect(plan.reusableRenders[0]?.assetId).toBe("asset-old-compass-open");
    expect(plan.missingRenders).toHaveLength(2);
    expect(
      plan.missingRenders.map(
        (target) => `${target.manifestEntityId}:${target.state?.id}`,
      ),
    ).toEqual(["old-compass:closed", "modern-compass:open"]);
  });

  it("treats another visual style as a separate render set", () => {
    const manifest = manifestWithCompasses();
    const oldCompass = manifest.entities[0];
    if (!oldCompass) throw new Error("TEST_ENTITY_REQUIRED");

    const storybookFingerprint = computeStoryVisualRenderFingerprint({
      identity: oldCompass.identity,
      state: { id: "open", label: "Open" },
      styleId: "lumi-storybook",
      styleVersion: 1,
      promptCompilerVersion: "visual-prompt-v1",
    });

    const plan = planMissingStoryVisualAssets({
      manifest: {
        ...manifest,
        entities: [oldCompass],
      },
      existingEntities: [],
      existingRenders: [
        {
          assetId: "asset-storybook-open",
          renderFingerprint: storybookFingerprint,
        },
      ],
      styleId: "paper-cut-world",
      styleVersion: 1,
      promptCompilerVersion: "visual-prompt-v1",
    });

    expect(plan.reusableRenders).toHaveLength(0);
    expect(plan.missingRenders).toHaveLength(2);
  });

  it("expands character outfit variants without inventing operational states", () => {
    const characterManifest: StoryVisualManifest = {
      schemaVersion: 1,
      storyId: "story-outfits",
      source: "story-generation",
      entities: [
        {
          manifestEntityId: "mira",
          identity: {
            entityId: "character-mira",
            kind: "character",
            category: "child",
            displayName: "Mira",
            canonicalRef: "character-mira",
            identityTraits: ["same face", "same hair"],
          },
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
          requiredStates: [],
          importance: "critical",
          reusable: true,
          sceneIds: ["scene-1", "scene-2"],
        },
      ],
      sceneBindings: [],
      storyIllustrations: [],
    };

    const plan = planMissingStoryVisualAssets({
      manifest: characterManifest,
      existingEntities: [],
      existingRenders: [],
      styleId: "lumi-storybook",
      styleVersion: 1,
      promptCompilerVersion: "visual-prompt-v1",
    });

    expect(plan.missingRenders).toHaveLength(2);
    expect(plan.missingRenders.map((target) => target.variant?.id)).toEqual([
      "desert-light",
      "mountain-winter",
    ]);
    expect(plan.missingRenders.every((target) => target.state === null)).toBe(
      true,
    );
  });
});
