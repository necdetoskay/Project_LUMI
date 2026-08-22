import { sha256Hex } from "./fingerprint";
import type { VisualStyleId } from "./visual-style";

export type StoryVisualEntityKind = "character" | "item" | "environment";
export type VisualVariantKind =
  | "outfit"
  | "condition"
  | "appearance"
  | "material"
  | "context";
export type StoryVisualImportance = "critical" | "important" | "supporting";

export type StoryVisualEntityIdentity = {
  entityId: string;
  kind: StoryVisualEntityKind;
  category: string;
  displayName: string;
  canonicalRef?: string | null;
  identityTraits: readonly string[];
};

export type StoryVisualVariant = {
  id: string;
  kind: VisualVariantKind;
  label: string;
  traits: readonly string[];
};

export type StoryVisualStateRef = { id: string; label: string };

export type StoryVisualEntityRequirement = {
  manifestEntityId: string;
  identity: StoryVisualEntityIdentity;
  variants: readonly StoryVisualVariant[];
  requiredStates: readonly StoryVisualStateRef[];
  importance: StoryVisualImportance;
  reusable: boolean;
  sceneIds: readonly string[];
};

export type StorySceneVisualUsage = {
  manifestEntityId: string;
  variantId?: string | null;
  stateId?: string | null;
  role: "primary" | "secondary" | "background";
};

export type StorySceneVisualBinding = {
  sceneId: string;
  usages: readonly StorySceneVisualUsage[];
};

export type StoryIllustrationRequirement = {
  id: string;
  sceneId: string;
  importance: StoryVisualImportance;
  compositionBrief: string;
};

export type StoryVisualManifest = {
  schemaVersion: 1;
  storyId: string;
  source: "story-generation" | "story-edit" | "backfill";
  entities: readonly StoryVisualEntityRequirement[];
  sceneBindings: readonly StorySceneVisualBinding[];
  storyIllustrations: readonly StoryIllustrationRequirement[];
};

export type StoryVisualAssetSet = {
  id: string;
  storyId: string;
  manifestFingerprint: string;
  styleId: VisualStyleId;
  styleVersion: number;
  status: "planned" | "generating" | "ready" | "partial" | "failed";
  active: boolean;
  createdAt: string;
};

const STORY_SCENE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCanonicalStorySceneId(value: string): boolean {
  return STORY_SCENE_ID_PATTERN.test(value);
}

function assertCanonicalStorySceneId(sceneId: string): void {
  if (!isCanonicalStorySceneId(sceneId)) {
    throw new Error("STORY_VISUAL_CANONICAL_SCENE_ID_REQUIRED");
  }
}

function normalize(values: readonly string[]): readonly string[] {
  return values
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

export function computeStoryVisualEntityFingerprint(
  identity: StoryVisualEntityIdentity,
): string {
  return sha256Hex(
    JSON.stringify({
      entityId: identity.entityId,
      kind: identity.kind,
      category: identity.category.trim().toLowerCase(),
      canonicalRef: identity.canonicalRef ?? null,
      identityTraits: normalize(identity.identityTraits),
    }),
  );
}

export function computeStoryVisualRenderFingerprint(input: {
  identity: StoryVisualEntityIdentity;
  variant?: StoryVisualVariant | null;
  state?: StoryVisualStateRef | null;
  styleId: VisualStyleId;
  styleVersion: number;
  promptCompilerVersion: string;
}): string {
  return sha256Hex(
    JSON.stringify({
      entityFingerprint: computeStoryVisualEntityFingerprint(input.identity),
      variant: input.variant
        ? {
            id: input.variant.id,
            kind: input.variant.kind,
            traits: normalize(input.variant.traits),
          }
        : null,
      stateId: input.state?.id ?? null,
      styleId: input.styleId,
      styleVersion: input.styleVersion,
      promptCompilerVersion: input.promptCompilerVersion,
    }),
  );
}

export function validateStoryVisualManifest(
  manifest: StoryVisualManifest,
): void {
  const concreteEntityIds = new Set<string>();
  const manifestEntityIds = new Set<string>();

  for (const requirement of manifest.entities) {
    if (!requirement.manifestEntityId.trim()) {
      throw new Error("STORY_VISUAL_MANIFEST_ENTITY_ID_REQUIRED");
    }
    if (!requirement.identity.entityId.trim()) {
      throw new Error("STORY_VISUAL_ENTITY_ID_REQUIRED");
    }
    if (manifestEntityIds.has(requirement.manifestEntityId)) {
      throw new Error("STORY_VISUAL_MANIFEST_ENTITY_ID_DUPLICATE");
    }
    manifestEntityIds.add(requirement.manifestEntityId);

    if (concreteEntityIds.has(requirement.identity.entityId)) {
      throw new Error("STORY_VISUAL_ENTITY_ID_DUPLICATE");
    }
    concreteEntityIds.add(requirement.identity.entityId);

    const variantIds = new Set<string>();
    for (const variant of requirement.variants) {
      if (variantIds.has(variant.id)) {
        throw new Error("STORY_VISUAL_VARIANT_ID_DUPLICATE");
      }
      variantIds.add(variant.id);
    }

    for (const sceneId of requirement.sceneIds) {
      assertCanonicalStorySceneId(sceneId);
    }
  }

  for (const binding of manifest.sceneBindings) {
    assertCanonicalStorySceneId(binding.sceneId);
    for (const usage of binding.usages) {
      const requirement = manifest.entities.find(
        (entry) => entry.manifestEntityId === usage.manifestEntityId,
      );
      if (!requirement) {
        throw new Error("STORY_VISUAL_SCENE_ENTITY_UNKNOWN");
      }
      if (
        usage.variantId &&
        !requirement.variants.some((variant) => variant.id === usage.variantId)
      ) {
        throw new Error("STORY_VISUAL_SCENE_VARIANT_UNKNOWN");
      }
      if (
        usage.stateId &&
        !requirement.requiredStates.some((state) => state.id === usage.stateId)
      ) {
        throw new Error("STORY_VISUAL_SCENE_STATE_UNKNOWN");
      }
    }
  }

  for (const illustration of manifest.storyIllustrations) {
    assertCanonicalStorySceneId(illustration.sceneId);
  }
}
