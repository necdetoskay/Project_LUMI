import { getItemVisualStates } from "./item-visual-state";
import {
  isCanonicalStorySceneId,
  validateStoryVisualManifest,
  type StoryIllustrationRequirement,
  type StorySceneVisualBinding,
  type StoryVisualEntityKind,
  type StoryVisualEntityRequirement,
  type StoryVisualManifest,
  type StoryVisualStateRef,
  type StoryVisualVariant,
} from "./story-visual-manifest";

export type StoryVisualExtractionEntity = {
  manifestEntityId: string;
  kind: StoryVisualEntityKind;
  category: string;
  displayName: string;
  canonicalRef?: string | null;
  identityTraits: readonly string[];
  variants?: readonly StoryVisualVariant[];
  requestedStateIds?: readonly string[];
  importance: "critical" | "important" | "supporting";
  reusable: boolean;
  sceneIds: readonly string[];
};

export type StoryVisualExtraction = {
  schemaVersion: 1;
  storyId: string;
  source: "story-generation" | "story-edit" | "backfill";
  entities: readonly StoryVisualExtractionEntity[];
  sceneBindings: readonly StorySceneVisualBinding[];
  storyIllustrations: readonly StoryIllustrationRequirement[];
};

export type StoryVisualSceneIdResolver = (
  sourceSceneRef: string,
) => string | null | undefined;

export type StoryVisualExtractionReconciliation = {
  manifest: StoryVisualManifest;
  warnings: readonly string[];
};

function reconcileItemStates(
  category: string,
  requestedStateIds: readonly string[],
  warnings: string[],
): readonly StoryVisualStateRef[] {
  const registryStates = getItemVisualStates(category);
  const allowed = new Map(registryStates.map((state) => [state.id, state]));
  const requested = [
    ...new Set(requestedStateIds.map((id) => id.trim()).filter(Boolean)),
  ];

  if (requested.length === 0) {
    return registryStates.map((state) => ({
      id: state.id,
      label: state.label,
    }));
  }

  const accepted = requested
    .map((id) => allowed.get(id))
    .filter((state): state is NonNullable<typeof state> => Boolean(state))
    .map((state) => ({ id: state.id, label: state.label }));

  const rejected = requested.filter((id) => !allowed.has(id));
  if (rejected.length > 0) {
    warnings.push(
      `STORY_VISUAL_STATE_REJECTED:${category}:${rejected.join(",")}`,
    );
  }

  if (accepted.length > 0) return accepted;

  warnings.push(`STORY_VISUAL_STATE_FALLBACK:${category}`);
  return registryStates.map((state) => ({ id: state.id, label: state.label }));
}

function resolveCanonicalSceneId(
  sourceSceneRef: string,
  resolveSceneId: StoryVisualSceneIdResolver,
): string {
  const canonicalSceneId = resolveSceneId(sourceSceneRef);
  if (!canonicalSceneId) {
    throw new Error(
      `STORY_VISUAL_SCENE_REFERENCE_UNRESOLVED:${sourceSceneRef}`,
    );
  }
  if (!isCanonicalStorySceneId(canonicalSceneId)) {
    throw new Error(
      `STORY_VISUAL_CANONICAL_SCENE_ID_REQUIRED:${sourceSceneRef}`,
    );
  }
  return canonicalSceneId;
}

export function reconcileStoryVisualExtraction(
  extraction: StoryVisualExtraction,
  resolveSceneId: StoryVisualSceneIdResolver,
): StoryVisualExtractionReconciliation {
  const warnings: string[] = [];
  const entityIds = new Set<string>();

  const entities: StoryVisualEntityRequirement[] = extraction.entities.map(
    (entity) => {
      if (!entity.manifestEntityId.trim()) {
        throw new Error("STORY_VISUAL_EXTRACTION_ENTITY_ID_REQUIRED");
      }
      if (entityIds.has(entity.manifestEntityId)) {
        throw new Error("STORY_VISUAL_EXTRACTION_ENTITY_ID_DUPLICATE");
      }
      entityIds.add(entity.manifestEntityId);

      const requiredStates =
        entity.kind === "item"
          ? reconcileItemStates(
              entity.category,
              entity.requestedStateIds ?? [],
              warnings,
            )
          : [];

      return {
        manifestEntityId: entity.manifestEntityId,
        identity: {
          entityId: entity.canonicalRef ?? entity.manifestEntityId,
          kind: entity.kind,
          category: entity.category,
          displayName: entity.displayName,
          canonicalRef: entity.canonicalRef ?? null,
          identityTraits: entity.identityTraits,
        },
        variants: entity.variants ?? [],
        requiredStates,
        importance: entity.importance,
        reusable: entity.reusable,
        sceneIds: entity.sceneIds.map((sceneId) =>
          resolveCanonicalSceneId(sceneId, resolveSceneId),
        ),
      };
    },
  );

  const manifest: StoryVisualManifest = {
    schemaVersion: 1,
    storyId: extraction.storyId,
    source: extraction.source,
    entities,
    sceneBindings: extraction.sceneBindings.map((binding) => ({
      ...binding,
      sceneId: resolveCanonicalSceneId(binding.sceneId, resolveSceneId),
    })),
    storyIllustrations: extraction.storyIllustrations.map((illustration) => ({
      ...illustration,
      sceneId: resolveCanonicalSceneId(illustration.sceneId, resolveSceneId),
    })),
  };

  validateStoryVisualManifest(manifest);

  return {
    manifest,
    warnings,
  };
}
