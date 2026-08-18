import { createHash } from "node:crypto";

import {
  appendSelectedStoryCandidate,
  buildWorkingStoryFromSandboxState,
  createTestRunUsageSnapshot,
  readStorySandboxScope,
  STORY_GENERATION_OPERATION,
  STORY_GENERATION_SCENARIO_KEY,
  type JsonObject,
  type JsonValue,
  type ProductionScenarioAdapter,
} from "@lumi/ai/test-lab";
import {
  resolveStoryNarrativeTarget,
  StoryAdventureGenerationService,
  type StoryLengthPreset,
  type StoryNarrativeTarget,
  type StorySceneLlmSettingsPort,
} from "@lumi/story/application";

import { callStoryOpenRouter } from "./text-generation/story-openrouter-caller";
import { NpcBeliefStoryContinuityContextAdapter } from "../story-continuity-context-runtime";
import { createProductionStoryContextComposer } from "../story-context-runtime";
import { WebStorySceneLlmSettingsAdapter } from "../story/story-scene-llm-settings.adapter";

export const storyProductionScenarioAdapter: ProductionScenarioAdapter = {
  async execute(request) {
    if (request.scenarioKey !== STORY_GENERATION_SCENARIO_KEY) {
      throw new Error(`TEST_LAB_UNSUPPORTED_SCENARIO:${request.scenarioKey}`);
    }
    if (request.productionOperation !== STORY_GENERATION_OPERATION) {
      throw new Error(
        `TEST_LAB_UNSUPPORTED_STORY_OPERATION:${request.productionOperation}`,
      );
    }

    const scope = readStorySandboxScope(request.parentState, request.phaseId);
    const workingStory = buildWorkingStoryFromSandboxState(
      request.parentState,
      scope,
    );
    const narrativeTarget = readNarrativeTarget(request.generationConfig);
    const baseSettings = new WebStorySceneLlmSettingsAdapter({
      userId: request.actor.userId,
      householdId: request.actor.householdId,
      childProfileId: request.actor.childProfileId,
    });
    const settingsPort: StorySceneLlmSettingsPort = {
      async resolveSettings() {
        return {
          ...(await baseSettings.resolveSettings()),
          modelId: request.modelSlug,
        };
      },
    };
    const contextComposer = createProductionStoryContextComposer({
      readWorkingStory: () => workingStory,
      readEmotionalState: () => [],
    });

    const generation =
      await new StoryAdventureGenerationService().generateAdventure({
        householdId: request.actor.householdId,
        worldId: scope.worldId,
        childProfileId: request.actor.childProfileId,
        characterId: scope.characterId,
        storySessionId: request.testSessionId,
        sourceFamily: scope.sourceFamily,
        sourceTitle: scope.sourceTitle,
        sourceTeaser: scope.sourceTeaser,
        sourceNpcIds: scope.sourceNpcIds,
        settingsPort,
        continuityPort: new NpcBeliefStoryContinuityContextAdapter(),
        contextComposer,
        narrativeTarget,
        callOpenRouter: callStoryOpenRouter,
      });

    const story = toJsonObject({
      phaseId: request.phaseId,
      scene: generation.scene,
      modelId: generation.modelId,
      narrativeTarget: generation.narrativeTarget,
      contextFingerprint: generation.contextManifest?.contentHash ?? null,
    });
    const candidateState = appendSelectedStoryCandidate({
      parentState: request.parentState,
      phaseId: request.phaseId,
      story,
    });
    const renderedPrompt = renderedPromptFromRequest(
      generation.providerRequest,
    );

    return {
      output: story,
      candidates: [{ payload: story, candidateState }],
      provenance: {
        promptKey: null,
        promptVersion: null,
        promptTemplateSnapshot: null,
        renderedPrompt,
        finalProviderRequest: toJsonObject(generation.providerRequest),
        renderedPromptFingerprint: fingerprint(renderedPrompt),
        contextFingerprint: generation.contextManifest?.contentHash ?? null,
        modelSlug: generation.modelId ?? request.modelSlug,
        usage: usageSnapshot(request, generation),
      },
    };
  },
};

function readNarrativeTarget(config?: JsonObject): StoryNarrativeTarget {
  const value = config?.["narrativeTarget"];
  if (value === undefined) return resolveStoryNarrativeTarget();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TEST_LAB_STORY_NARRATIVE_TARGET_OBJECT_REQUIRED");
  }
  const target = value as JsonObject;
  const preset = target["preset"];
  if (!isLengthPreset(preset)) {
    throw new Error("TEST_LAB_STORY_LENGTH_PRESET_INVALID");
  }
  return resolveStoryNarrativeTarget({
    preset,
    ...(typeof target["minCharacters"] === "number"
      ? { minCharacters: target["minCharacters"] }
      : {}),
    ...(typeof target["maxCharacters"] === "number"
      ? { maxCharacters: target["maxCharacters"] }
      : {}),
  });
}

function isLengthPreset(
  value: JsonValue | undefined,
): value is StoryLengthPreset {
  return (
    value === "short" ||
    value === "medium" ||
    value === "long" ||
    value === "custom"
  );
}

function renderedPromptFromRequest(request: {
  messages: Array<{ role: string; content: string }>;
}): { system: string; user: string } {
  return {
    system: request.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n"),
    user: request.messages
      .filter((message) => message.role !== "system")
      .map((message) => message.content)
      .join("\n\n"),
  };
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function usageSnapshot(
  request: Parameters<ProductionScenarioAdapter["execute"]>[0],
  generation: Awaited<
    ReturnType<StoryAdventureGenerationService["generateAdventure"]>
  >,
) {
  const usage = generation.providerTelemetry.usage;
  if (
    !usage ||
    usage.inputTokens === null ||
    usage.outputTokens === null ||
    usage.totalTokens === null
  ) {
    return null;
  }

  return createTestRunUsageSnapshot({
    pricing: request.pricingSnapshot,
    providerUsage: {
      promptTokens: usage.inputTokens,
      completionTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      latencyMs: generation.providerTelemetry.latencyMs ?? 0,
      costUsd: generation.providerTelemetry.estimatedCostUsd ?? 0,
    },
    retryCount: Math.max(0, generation.attempt - 1),
  });
}

function toJsonObject(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("TEST_LAB_JSON_OBJECT_REQUIRED");
  }
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}
