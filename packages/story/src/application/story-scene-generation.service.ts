import type {
  ContextManifest,
  StoryGenerationContextComposer,
} from "@lumi/context";

import { buildHookSceneBrief } from "../domain/hook-scene-brief";
import type { StoryHookState } from "../domain/story-types";
import {
  normalizeStoryContinuityContext,
  type StoryContinuityContextPort,
} from "./story-continuity-context";
import {
  resolveStoryNarrativeTarget,
  type StoryNarrativeTarget,
} from "./story-length-policy";
import { buildStoryScenePrompt } from "./story-scene-prompt";
import {
  parseAndValidateSceneOutput,
  type GeneratedScene,
} from "./story-scene-output";
import {
  LlmConfigError,
  LlmGenerationError,
  type StorySceneLlmSettingsPort,
} from "./story-scene-llm-settings";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterCallInput {
  model: string;
  messages: OpenRouterMessage[];
  temperature: number;
  maxTokens: number;
}

export interface OpenRouterCallResult {
  content: string;
  model: string;
}

export type OpenRouterCaller = (
  apiKey: string,
  input: OpenRouterCallInput,
) => Promise<OpenRouterCallResult>;

export interface StorySceneGenerationInput {
  hook: StoryHookState;
  settingsPort: StorySceneLlmSettingsPort;
  continuityPort?: StoryContinuityContextPort;
  /** Canonical context composer. Production callers should provide this. */
  contextComposer?: StoryGenerationContextComposer;
  childProfileId?: string | null;
  characterId?: string | null;
  /** Canonical story session scope forwarded to context retrieval. */
  storySessionId?: string | undefined;
  /** Optional scene focus forwarded to context retrieval/ranking. */
  sceneFocus?: string | undefined;
  /** Product/Test Lab narrative target. Defaults to the medium production preset. */
  narrativeTarget?: StoryNarrativeTarget;
  callOpenRouter?: OpenRouterCaller;
  maxAttempts?: number;
}

export interface StorySceneGenerationResult {
  scene: GeneratedScene;
  modelId: string | null;
  attempt: number;
  narrativeTarget: StoryNarrativeTarget;
  /** Exact canonical manifest consumed by the successful generation call. */
  contextManifest: ContextManifest | null;
}

/**
 * Generates an LLM-rendered story scene from an accepted hook. The canonical
 * @lumi/context manifest is assembled once before retries and injected into
 * every prompt, so retries cannot silently change world/memory/policy context.
 */
export class StorySceneGenerationService {
  async generateSceneFromHook(
    input: StorySceneGenerationInput,
  ): Promise<StorySceneGenerationResult> {
    const maxAttempts = input.maxAttempts ?? 3;
    const narrativeTarget = input.narrativeTarget ?? resolveStoryNarrativeTarget();
    const brief = buildHookSceneBrief(input.hook);
    const settings = await input.settingsPort.resolveSettings();
    const relevantNpcIds = [
      input.hook.sourceNpcId,
      input.hook.targetNpcId,
    ].filter((value): value is string => Boolean(value));
    const continuityContext = input.continuityPort
      ? normalizeStoryContinuityContext(
          await input.continuityPort.resolveContext({
            householdId: input.hook.householdId,
            worldId: input.hook.worldId,
            childProfileId: input.childProfileId ?? input.hook.childProfileId,
            characterId: input.characterId ?? null,
            npcIds: [...new Set(relevantNpcIds)],
          }),
        )
      : null;
    const allowedContinuityKeys = new Set(
      continuityContext?.facts.map((fact) => fact.key) ?? [],
    );

    const resolvedChildProfileId =
      input.childProfileId ?? input.hook.childProfileId ?? null;
    const generationContext =
      input.contextComposer && resolvedChildProfileId
        ? await input.contextComposer.build({
            householdId: input.hook.householdId,
            childProfileId: resolvedChildProfileId,
            worldId: input.hook.worldId,
            storySessionId: input.storySessionId,
            focalCharacterId: input.characterId ?? undefined,
            sceneFocus: input.sceneFocus ?? brief.payloadSummary ?? undefined,
            snapshot: {
              hookId: input.hook.id,
              hookType: input.hook.hookType,
              sourceNpcId: input.hook.sourceNpcId ?? null,
              targetNpcId: input.hook.targetNpcId ?? null,
            },
          })
        : null;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const generationNonce = crypto.randomUUID();
      const prompt = buildStoryScenePrompt({
        brief,
        contentBoundary: settings.contentBoundary,
        ageBand: settings.ageBand,
        locale: settings.locale,
        generationNonce,
        narrativeTarget,
        continuityContext,
        generationContext,
      });

      let response: OpenRouterCallResult;
      try {
        response = await this.callProvider(input, settings.apiKey, {
          model: settings.modelId,
          messages: [
            {
              role: "system",
              content:
                "Sen çocuk hikayeleri için güvenli sahne üreten yaratıcı bir asistansın. Sadece geçerli JSON döndür.",
            },
            { role: "user", content: prompt },
          ],
          temperature: settings.temperature,
          maxTokens: settings.maxOutputTokens,
        });
      } catch (error) {
        if (error instanceof LlmConfigError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new LlmGenerationError(`Story scene LLM call failed: ${message}`);
      }

      const parsed = parseAndValidateSceneOutput(response.content);
      if (parsed.scene) {
        const usedContinuityKeys = parsed.scene.usedContinuityKeys ?? [];
        const invalidContinuityKeys = usedContinuityKeys.filter(
          (key) => !allowedContinuityKeys.has(key),
        );
        if (invalidContinuityKeys.length > 0) {
          lastError = new LlmGenerationError(
            `Story scene continuity usage validation failed: unknown keys ${invalidContinuityKeys.join(", ")}`,
          );
          continue;
        }

        const narrativeLength = parsed.scene.narrative.length;
        if (
          narrativeLength < narrativeTarget.minCharacters ||
          narrativeLength > narrativeTarget.maxCharacters
        ) {
          lastError = new LlmGenerationError(
            `Story scene narrative length must be ${narrativeTarget.minCharacters}-${narrativeTarget.maxCharacters} characters; got ${narrativeLength}`,
          );
          continue;
        }

        return {
          scene: parsed.scene,
          modelId: response.model || null,
          attempt,
          narrativeTarget,
          contextManifest: generationContext,
        };
      }

      lastError = new LlmGenerationError(
        `Story scene output validation failed: ${parsed.errors.join("; ")}`,
      );
    }

    throw lastError ?? new LlmGenerationError("Story scene generation failed");
  }

  private async callProvider(
    input: StorySceneGenerationInput,
    apiKey: string,
    callInput: OpenRouterCallInput,
  ): Promise<OpenRouterCallResult> {
    const caller = input.callOpenRouter;
    if (!caller) {
      throw new LlmConfigError(
        "LLM_KEY_MISSING",
        "Story scene LLM caller is not configured.",
      );
    }
    return caller(apiKey, callInput);
  }
}
