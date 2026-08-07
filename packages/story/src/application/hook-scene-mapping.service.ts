import type { HookType, SceneType } from "../domain/story-types";
import { HOOK_TYPES, SCENE_TYPES, assertKnownHookType } from "../domain/story-types";

const HOOK_TO_SCENE_MAP: Record<HookType, SceneType> = {
  rumor: "narrative",
  gift: "choice",
  warning: "narrative",
  invitation: "transition",
  quest_seed: "narrative",
  social_visit: "transition",
  information_share: "narrative",
};

export function mapHookToScene(hookType: HookType): SceneType {
  assertKnownHookType(hookType);
  return HOOK_TO_SCENE_MAP[hookType];
}

export function getSupportedHookTypes(): readonly HookType[] {
  return HOOK_TYPES;
}

export function getSupportedSceneTypes(): readonly SceneType[] {
  return SCENE_TYPES;
}

export interface SceneCandidate {
  id: string;
  sceneType: string;
  sequenceNumber: number;
}

/**
 * Selects the next scene for a story advance influenced by a pending hook.
 * Deterministic, additive, type-independent: it prefers an unvisited scene
 * matching the hook's mapped scene type (lowest sequence wins), falling back
 * to the next unvisited scene in sequence order. Returns undefined when no
 * suitable candidate exists.
 */
export function selectNextSceneForHook(
  hook: { sceneType: SceneType } | undefined,
  scenes: SceneCandidate[],
  visitedSceneIds: ReadonlySet<string>,
): SceneCandidate | undefined {
  const candidates = scenes
    .filter((s) => !visitedSceneIds.has(s.id))
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  if (candidates.length === 0) return undefined;

  if (hook) {
    const matching = candidates.find((s) => s.sceneType === hook.sceneType);
    if (matching) return matching;
  }

  return candidates[0];
}