import type { EmotionalStateItem, WorkingStoryItem } from "@lumi/context";
import { getCharacterBootstrapStatus } from "@lumi/profiles/application";
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
import { callStoryOpenRouter } from "../ai/text-generation/story-openrouter-caller";
import { PersistedCharacterDecisionContextAdapter } from "../emotional-decision-runtime";
import { NpcBeliefStoryContinuityContextAdapter } from "../story-continuity-context-runtime";
import { createProductionStoryContextComposer } from "../story-context-runtime";
import {
  readUsedContinuityKeysFromSceneMetadata,
  reinforceSceneMemoryUsage,
} from "./canonical-memory-usage.service";
import { WebStorySceneLlmSettingsAdapter } from "./story-scene-llm-settings.adapter";

export interface GenerateHookReaderTurnInput {
  userId: string;
  householdId: string;
  sessionId: string;
  hookId: string;
  expectedVersion: number;
}

function arousalFromUrgency(urgency: number): EmotionalStateItem["arousal"] {
  if (urgency >= 0.67) return "high";
  if (urgency >= 0.34) return "medium";
  return "low";
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

    await reinforceSceneMemoryUsage({
      householdId: input.householdId,
      worldId: hook.worldId,
      childProfileId: session.childProfileId,
      sceneId: existingScene.id,
      usedContinuityKeys: readUsedContinuityKeysFromSceneMetadata(
        existingScene.metadata,
      ),
    });

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

  const bootstrap = await getCharacterBootstrapStatus(
    input.userId,
    input.householdId,
    session.childProfileId,
  );
  const characterId = bootstrap.character?.id ?? null;

  const settingsPort = new WebStorySceneLlmSettingsAdapter({
    userId: input.userId,
    householdId: input.householdId,
    childProfileId: session.childProfileId,
  });
  const continuityPort = new NpcBeliefStoryContinuityContextAdapter();
  const decisionContext = new PersistedCharacterDecisionContextAdapter();

  const workingStory: WorkingStoryItem = {
    mode: session.playbackMode,
    sceneGoal: `Resolve accepted story hook ${hook.id} (${hook.hookType}) within the current session.`,
    worldFacts: [],
    activeCharacterContexts: characterId
      ? [
          {
            characterId,
            currentState: [],
            activeGoal: "",
            relevantMemories: [],
            relationshipNotes: [],
            beliefNotes: [],
            behaviorGuidance: [],
          },
        ]
      : [],
    playerKnownFacts: [],
    hiddenFacts: [],
    pendingEvents: [hook.hookType],
    fixedDecisions: [],
    mustInclude: [],
    mustNotInclude: [],
    tone: "",
    ageGuidance: [],
  };

  const contextComposer = createProductionStoryContextComposer({
    readWorkingStory: () => workingStory,
    readEmotionalState: async () => {
      if (!characterId) return [];
      const vector = await decisionContext.resolve({
        userId: input.userId,
        householdId: input.householdId,
        characterId,
      });
      const dominantEmotions = Object.entries(vector.emotions)
        .filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emotion, intensity]) => `${emotion}:${intensity.toFixed(2)}`);
      const topGoal = vector.goals[0];
      const topNeed = vector.needs[0];

      return [
        {
          characterId,
          dominantEmotions,
          behaviorGuidance: [
            topGoal ? `Prefer actions aligned with the active goal.` : null,
            topNeed ? `Respect the character's strongest current need.` : null,
          ].filter((value): value is string => Boolean(value)),
          arousal: arousalFromUrgency(vector.urgency),
        },
      ];
    },
  });

  const generation =
    await new StorySceneGenerationService().generateSceneFromHook({
      hook,
      settingsPort,
      continuityPort,
      contextComposer,
      callOpenRouter: callStoryOpenRouter,
      childProfileId: session.childProfileId,
      characterId,
      storySessionId: input.sessionId,
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

  await reinforceSceneMemoryUsage({
    householdId: input.householdId,
    worldId: hook.worldId,
    childProfileId: session.childProfileId,
    sceneId: persisted.generatedSceneId,
    usedContinuityKeys: generation.scene.usedContinuityKeys ?? [],
  });

  await markStoryHookConsumed(scope);

  return {
    generated: true,
    reusedPersistedScene: persisted.reusedPersistedScene,
    sceneId: persisted.generatedSceneId,
    playback: persisted.playbackState,
  };
}
