import { describe, expect, it } from "vitest";

import {
  computeStoryVisualEntityFingerprint,
  computeStoryVisualRenderFingerprint,
  validateStoryVisualManifest,
  type StoryVisualEntityIdentity,
  type StoryVisualManifest,
} from "../../src/domain";

const SCENE_ID = "10000000-0000-4000-8000-000000000001";

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
          sceneIds: [SCENE_ID],
        },
        {
          manifestEntityId: "story-compass-b",
          identity: newCompass,
          variants: [],
          requiredStates: [{ id: "open", label: "Open" }],
          importance: "important",
          reusable: true,
          sceneIds: [SCENE_ID],
        },
      ],
      sceneBindings: [
        {
          sceneId: SCENE_ID,
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
          sceneIds: [SCENE_ID],
        },
      ],
      sceneBindings: [
        {
          sceneId: SCENE_ID,
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

  it("rejects source slugs in a final manifest", () => {
    const manifest: StoryVisualManifest = {
      schemaVersion: 1,
      storyId: "story-3",
      source: "story-generation",
      entities: [],
      sceneBindings: [],
      storyIllustrations: [
        {
          id: "illustration-1",
          sceneId: "provider-scene-17",
          importance: "critical",
          compositionBrief: "Mira enters the library",
        },
      ],
    };

    expect(() => validateStoryVisualManifest(manifest)).toThrow(
      "STORY_VISUAL_CANONICAL_SCENE_ID_REQUIRED",
    );
  });
});
