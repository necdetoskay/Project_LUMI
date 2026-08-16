import type { EmotionalStateItem, WorkingStoryItem } from "@lumi/context";
import { getCharacterBootstrapStatus } from "@lumi/profiles/application";
import {
  getSessionPlaybackState,
  persistGeneratedSceneAndAdvance,
  StoryAdventureGenerationService,
  type AdventureSourceFamily,
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

export interface GenerateAdventureReaderTurnInput {
  userId: string;
  householdId: string;
  sessionId: string;
  worldId: string;
  candidateId: string;
  sourceFamily: AdventureSourceFamily;
  sourceTitle: string;
  sourceTeaser?: string | null;
  expectedVersion: number;
}

function arousalFromUrgency(urgency: number): EmotionalStateItem["arousal"] {
  if (urgency >= 0.67) return "high";
  if (urgency >= 0.34) return "medium";
  return "low";
}

/**
 * Production UI orchestration for world/inventory adventure starts. It is
 * deliberately separate from accepted NPC opportunity hooks, while consuming
 * the same LLM settings, Context Builder, continuity and scene persistence
 * boundaries.
 */
export async function generateAdventureReaderTurn(
  input: GenerateAdventureReaderTurnInput,
) {
  const playback = await getSessionPlaybackState(input.sessionId);
  const session = playback.session;
  if (session.householdId !== input.householdId) {
    throw new ValidationError(
      "ADVENTURE_SESSION_SCOPE_MISMATCH",
      "Story session does not belong to the requested household",
    );
  }
  if (session.version !== input.expectedVersion) {
    throw new ValidationError(
      "VERSION_CONFLICT",
      "Session version conflict; adventure generation was not started",
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
    sceneGoal: `Tell a complete short adventure beginning from ${input.sourceFamily}: ${input.sourceTitle}.`,
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
    pendingEvents: [input.sourceFamily],
    fixedDecisions: [],
    mustInclude: [input.sourceTitle],
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
      return [
        {
          characterId,
          dominantEmotions,
          behaviorGuidance: [
            vector.goals[0]
              ? "Prefer actions aligned with the active goal."
              : null,
            vector.needs[0]
              ? "Respect the character's strongest current need."
              : null,
          ].filter((value): value is string => Boolean(value)),
          arousal: arousalFromUrgency(vector.urgency),
        },
      ];
    },
  });

  const generation =
    await new StoryAdventureGenerationService().generateAdventure({
      householdId: input.householdId,
      worldId: input.worldId,
      childProfileId: session.childProfileId,
      characterId,
      storySessionId: input.sessionId,
      sourceFamily: input.sourceFamily,
      sourceTitle: input.sourceTitle,
      sourceTeaser: input.sourceTeaser ?? null,
      settingsPort,
      continuityPort,
      contextComposer,
      callOpenRouter: callStoryOpenRouter,
    });

  const persisted = await persistGeneratedSceneAndAdvance({
    sessionId: input.sessionId,
    expectedVersion: input.expectedVersion,
    scene: generation.scene,
    sceneType: "narrative",
    modelId: generation.modelId,
    sourceKey: input.candidateId,
    actorUserId: input.userId,
    contextSnapshot: {
      adventureStart: {
        candidateId: input.candidateId,
        sourceFamily: input.sourceFamily,
        sourceTitle: input.sourceTitle,
        sourceTeaser: input.sourceTeaser ?? null,
      },
    },
    ...(generation.contextManifest && generation.modelId
      ? {
          generationInspection: {
            modelId: generation.modelId,
            attempt: generation.attempt,
            contextManifest: generation.contextManifest,
          },
        }
      : {}),
    idempotencyKey: `generated-adventure-reader:${input.candidateId}`,
  });

  await reinforceSceneMemoryUsage({
    householdId: input.householdId,
    worldId: input.worldId,
    childProfileId: session.childProfileId,
    sceneId: persisted.generatedSceneId,
    usedContinuityKeys: generation.scene.usedContinuityKeys ?? [],
  });

  return {
    generated: true,
    sceneId: persisted.generatedSceneId,
    playback: persisted.playbackState,
    modelId: generation.modelId,
    attempt: generation.attempt,
    usedContinuityKeys: readUsedContinuityKeysFromSceneMetadata({
      usedContinuityKeys: generation.scene.usedContinuityKeys ?? [],
    }),
  };
}
