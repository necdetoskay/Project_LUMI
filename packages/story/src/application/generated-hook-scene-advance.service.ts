import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import type { StoryHookState } from "../domain/story-types";
import { NotFoundError, ValidationError } from "../domain/errors";
import { getStoryDb } from "./db";
import {
  StorySceneGenerationService,
  type OpenRouterCaller,
} from "./story-scene-generation.service";
import type { StorySceneLlmSettingsPort } from "./story-scene-llm-settings";
import { advanceSession } from "./story-session.service";

export interface AdvanceGeneratedHookSceneInput {
  hook: StoryHookState;
  expectedVersion: number;
  settingsPort: StorySceneLlmSettingsPort;
  callOpenRouter: OpenRouterCaller;
}

/**
 * Production composition boundary for S37.
 *
 * A generated hook scene becomes a canonical `story_scenes` record and then
 * enters the normal `advanceSession` path. The hook UUID is reused as the
 * generated scene UUID, giving retries a deterministic persistence identity.
 * Generation happens before the first write, so provider/settings failures do
 * not mutate session state. If persistence succeeds but a later optimistic
 * session advance fails, a replay reuses the already persisted scene rather
 * than paying for / creating another generated scene.
 */
export async function advanceGeneratedHookScene(
  input: AdvanceGeneratedHookSceneInput,
) {
  const db = getStoryDb();
  const repo = new DrizzleStoryRepository();
  const session = await repo.findSessionById(db, input.hook.storySessionId);
  if (!session) {
    throw new NotFoundError("StorySession", input.hook.storySessionId);
  }

  if (
    session.householdId !== input.hook.householdId ||
    session.childProfileId !== input.hook.childProfileId ||
    session.worldId !== input.hook.worldId
  ) {
    throw new ValidationError(
      "HOOK_SESSION_SCOPE_MISMATCH",
      "Story hook does not belong to the target session scope",
    );
  }

  if (session.version !== input.expectedVersion) {
    throw new ValidationError(
      "VERSION_CONFLICT",
      "Session version conflict; reload current state",
    );
  }

  let persistedScene = await repo.findSceneById(db, input.hook.id);
  let generated = false;

  if (!persistedScene) {
    const generation = await new StorySceneGenerationService().generateSceneFromHook({
      hook: input.hook,
      settingsPort: input.settingsPort,
      callOpenRouter: input.callOpenRouter,
      childProfileId: input.hook.childProfileId,
    });

    const scenes = await repo.findScenesByVersion(db, session.storyVersionId);
    const sequenceNumber =
      scenes.reduce(
        (max, scene) => Math.max(max, scene.sequenceNumber ?? 0),
        -1,
      ) + 1;

    persistedScene = await repo.createScene(db, {
      id: input.hook.id,
      storyVersionId: session.storyVersionId,
      sceneKey: `generated-hook-${input.hook.id}`,
      sequenceNumber,
      sceneType: input.hook.sceneType,
      title: generation.scene.moment.slice(0, 300),
      narrativeText: generation.scene.narrative,
      isEntryScene: false,
      isTerminalScene: false,
      metadata: {
        generated: true,
        source: "story_hook",
        sourceHookId: input.hook.id,
        opportunityId: input.hook.opportunityId,
        llmSceneId: generation.scene.sceneId,
        modelId: generation.modelId,
        generationAttempt: generation.attempt,
        setting: generation.scene.setting,
        characters: generation.scene.characters,
        moment: generation.scene.moment,
        nextPrompt: generation.scene.nextPrompt,
      },
      createdAt: new Date(),
    });
    generated = true;
  } else if (persistedScene.storyVersionId !== session.storyVersionId) {
    throw new ValidationError(
      "HOOK_SCENE_VERSION_MISMATCH",
      "Persisted generated hook scene belongs to another story version",
    );
  }

  const playback = await advanceSession({
    sessionId: session.id,
    expectedVersion: input.expectedVersion,
    nextSceneId: persistedScene.id,
    idempotencyKey: `hook-scene-advance:${input.hook.id}`,
  });

  return {
    playback,
    generated,
    sceneId: persistedScene.id,
  };
}
