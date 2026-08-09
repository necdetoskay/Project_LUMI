import { callOpenRouter } from "@lumi/profiles/application";
import {
  advanceSession,
  findGeneratedSceneForHook,
  getSessionPlaybackState,
  getStoryHookForConsumption,
  markStoryHookConsumed,
  persistGeneratedSceneAndAdvance,
  StorySceneGenerationService,
} from "@lumi/story/application";
import { ValidationError } from "@lumi/story/domain";
import { WebStorySceneLlmSettingsAdapter } from "./story-scene-llm-settings.adapter";

export interface GenerateHookReaderTurnInput {
  userId: string;
  householdId: string;
  sessionId: string;
  hookId: string;
  expectedVersion: number;
}

export async function generateHookReaderTurn(
  input: GenerateHookReaderTurnInput,
) {
  const playback = await getSessionPlaybackState(input.sessionId);
  const session = playback.session;

  if (session.householdId !== input.householdId) {
    throw new ValidationError(
      "HOOK_SESSION_SCOPE_MISMATCH",
      "Story session does not belong to the requested household",
    );
  }

  const scope = {
    hookId: input.hookId,
    sessionId: input.sessionId,
    householdId: input.householdId,
    childProfileId: session.childProfileId,
  };
  const hook = await getStoryHookForConsumption(scope);
  const existingScene = await findGeneratedSceneForHook({
    sessionId: input.sessionId,
    sourceHookId: input.hookId,
  });

  if (existingScene) {
    if (session.currentSceneId !== existingScene.id) {
      await advanceSession({
        sessionId: input.sessionId,
        expectedVersion: input.expectedVersion,
        nextSceneId: existingScene.id,
        idempotencyKey: `generated-hook-reader:${input.hookId}`,
      });
    }

    await markStoryHookConsumed(scope);
    return {
      generated: false,
      reusedPersistedScene: true,
      sceneId: existingScene.id,
      playback: await getSessionPlaybackState(input.sessionId),
    };
  }

  if (session.version !== input.expectedVersion) {
    throw new ValidationError(
      "VERSION_CONFLICT",
      "Session version conflict; story scene generation was not started",
    );
  }

  const settingsPort = new WebStorySceneLlmSettingsAdapter({
    userId: input.userId,
    householdId: input.householdId,
    childProfileId: session.childProfileId,
  });
  const generation = await new StorySceneGenerationService().generateSceneFromHook({
    hook,
    settingsPort,
    callOpenRouter,
    childProfileId: session.childProfileId,
  });

  const persisted = await persistGeneratedSceneAndAdvance({
    sessionId: input.sessionId,
    expectedVersion: input.expectedVersion,
    scene: generation.scene,
    sceneType: hook.sceneType,
    modelId: generation.modelId,
    sourceHookId: hook.id,
    idempotencyKey: `generated-hook-reader:${hook.id}`,
  });

  await markStoryHookConsumed(scope);

  return {
    generated: true,
    reusedPersistedScene: persisted.reusedPersistedScene,
    sceneId: persisted.generatedSceneId,
    playback: persisted.playbackState,
  };
}
