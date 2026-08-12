import { describe, expect, it } from "vitest";

import {
  computeStoryVisualEntityFingerprint,
  computeStoryVisualRenderFingerprint,
  validateStoryVisualManifest,
  type StoryVisualEntityIdentity,
  type StoryVisualManifest,
} from "../../src/domain";

function compass(
  entityId: string,
  traits: readonly string[],
): StoryVisualEntityIdentity {
  return {
    entityId,
    kind: "item",
    category: "compass",
    displayName: entityId,
    identityTraits: traits,
  };
}

describe("story visual manifest", () => {
  it("keeps two different compasses distinct even when category is identical", () => {
    const oldCompass = compass("compass-old-brass", [
      "old brass frame",
      "scratched glass",
    ]);
    const newCompass = compass("compass-modern-plastic", [
      "black plastic body",
      "clean acrylic cover",
    ]);

    expect(computeStoryVisualEntityFingerprint(oldCompass)).not.toBe(
      computeStoryVisualEntityFingerprint(newCompass),
    );

    const manifest: StoryVisualManifest = {
      schemaVersion: 1,
      storyId: "story-1",
      source: "story-generation",
      entities: [
        {
          manifestEntityId: "story-compass-a",
          identity: oldCompass,
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
          manifestEntityId: "story-compass-b",
          identity: newCompass,
          variants: [],
          requiredStates: [{ id: "open", label: "Open" }],
          importance: "important",
          reusable: true,
          sceneIds: ["scene-1"],
        },
      ],
      sceneBindings: [
        {
          sceneId: "scene-1",
          usages: [
            {
              manifestEntityId: "story-compass-a",
              stateId: "closed",
              role: "primary",
            },
            {
              manifestEntityId: "story-compass-b",
              stateId: "open",
              role: "secondary",
            },
          ],
        },
      ],
      storyIllustrations: [],
    };

    expect(() => validateStoryVisualManifest(manifest)).not.toThrow();
  });

  it("keeps character identity stable while outfit variant changes render identity", () => {
    const mira: StoryVisualEntityIdentity = {
      entityId: "character-mira",
      kind: "character",
      category: "child",
      displayName: "Mira",
      canonicalRef: "character-mira",
      identityTraits: ["same face", "same hair", "same proportions"],
    };
    const desert = {
      id: "desert-light",
      kind: "outfit" as const,
      label: "Desert light",
      traits: ["light linen clothes", "sun hat"],
    };
    const winter = {
      id: "mountain-winter",
      kind: "outfit" as const,
      label: "Mountain winter",
      traits: ["thick coat", "warm boots"],
    };

    expect(computeStoryVisualEntityFingerprint(mira)).toBe(
      computeStoryVisualEntityFingerprint(mira),
    );
    expect(
      computeStoryVisualRenderFingerprint({
        identity: mira,
        variant: desert,
        styleId: "lumi-storybook",
        styleVersion: 1,
        promptCompilerVersion: "v1",
      }),
    ).not.toBe(
      computeStoryVisualRenderFingerprint({
        identity: mira,
        variant: winter,
        styleId: "lumi-storybook",
        styleVersion: 1,
        promptCompilerVersion: "v1",
      }),
    );
  });

  it("rejects scene bindings that reference an unknown variant", () => {
    const manifest: StoryVisualManifest = {
      schemaVersion: 1,
      storyId: "story-2",
      source: "backfill",
      entities: [
        {
          manifestEntityId: "mira",
          identity: {
            entityId: "character-mira",
            kind: "character",
            category: "child",
            displayName: "Mira",
            identityTraits: ["canonical Mira"],
          },
          variants: [],
          requiredStates: [],
          importance: "critical",
          reusable: true,
          sceneIds: ["scene-1"],
        },
      ],
      sceneBindings: [
        {
          sceneId: "scene-1",
          usages: [
            { manifestEntityId: "mira", variantId: "winter", role: "primary" },
          ],
        },
      ],
      storyIllustrations: [],
    };

    expect(() => validateStoryVisualManifest(manifest)).toThrow(
      "STORY_VISUAL_SCENE_VARIANT_UNKNOWN",
    );
  });
});
