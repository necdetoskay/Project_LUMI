import { ValidationError } from "../domain/errors";
import { getStoryVersionGraph } from "./story-definition.service";
import { getSessionById } from "./story-session.service";

export type StorySceneReferenceCandidate = {
  id: string;
  sceneKey: string;
  metadata: unknown;
};

export type ResolveCanonicalStorySceneReferencesInput = {
  sessionId: string;
  scenes: readonly StorySceneReferenceCandidate[];
  sourceRefs: readonly string[];
};

function metadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

function isSceneInSessionScope(
  scene: StorySceneReferenceCandidate,
  sessionId: string,
): boolean {
  const metadata = metadataRecord(scene.metadata);
  if (metadata?.generated !== true) return true;
  return metadata.generatedForSessionId === sessionId;
}

function sourceGeneratedSceneId(
  scene: StorySceneReferenceCandidate,
): string | null {
  const metadata = metadataRecord(scene.metadata);
  return typeof metadata?.sourceGeneratedSceneId === "string"
    ? metadata.sourceGeneratedSceneId
    : null;
}

function matchesSceneReference(
  scene: StorySceneReferenceCandidate,
  sourceRef: string,
): boolean {
  return (
    scene.id === sourceRef ||
    scene.sceneKey === sourceRef ||
    sourceGeneratedSceneId(scene) === sourceRef
  );
}

export function resolveCanonicalStorySceneReferences(
  input: ResolveCanonicalStorySceneReferencesInput,
): ReadonlyMap<string, string> {
  const resolved = new Map<string, string>();

  for (const sourceRef of new Set(input.sourceRefs)) {
    if (!sourceRef || sourceRef.trim() !== sourceRef) {
      throw new ValidationError(
        "STORY_SCENE_REFERENCE_INVALID",
        "Story scene reference must be a non-empty stable value",
        "sceneId",
      );
    }

    const matches = new Map<string, StorySceneReferenceCandidate>();
    for (const scene of input.scenes) {
      if (!isSceneInSessionScope(scene, input.sessionId)) continue;
      if (matchesSceneReference(scene, sourceRef)) {
        matches.set(scene.id, scene);
      }
    }

    if (matches.size === 0) {
      throw new ValidationError(
        "STORY_SCENE_REFERENCE_NOT_FOUND",
        `Story scene reference ${sourceRef} does not resolve in this session scope`,
        "sceneId",
      );
    }
    if (matches.size > 1) {
      throw new ValidationError(
        "STORY_SCENE_REFERENCE_AMBIGUOUS",
        `Story scene reference ${sourceRef} resolves to multiple persisted scenes`,
        "sceneId",
      );
    }

    const canonicalSceneId = matches.keys().next().value;
    if (!canonicalSceneId) {
      throw new ValidationError(
        "STORY_SCENE_REFERENCE_NOT_FOUND",
        `Story scene reference ${sourceRef} does not resolve in this session scope`,
        "sceneId",
      );
    }
    resolved.set(sourceRef, canonicalSceneId);
  }

  return resolved;
}

export async function resolveCanonicalStorySceneReferencesForSession(input: {
  sessionId: string;
  sourceRefs: readonly string[];
}): Promise<ReadonlyMap<string, string>> {
  const session = await getSessionById(input.sessionId);
  const graph = await getStoryVersionGraph(session.storyVersionId);

  if (graph.version.storyDefinitionId !== session.storyDefinitionId) {
    throw new ValidationError(
      "STORY_SCENE_SCOPE_MISMATCH",
      "Story session and story version belong to different story definitions",
      "storyVersionId",
    );
  }

  return resolveCanonicalStorySceneReferences({
    sessionId: input.sessionId,
    scenes: graph.scenes,
    sourceRefs: input.sourceRefs,
  });
}
