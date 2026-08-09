import { buildHookSceneBrief } from "../domain/hook-scene-brief";
import type { StoryHookState } from "../domain/story-types";
import {
  normalizeStoryContinuityContext,
  type StoryContinuityContextPort,
} from "./story-continuity-context";
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

/** Minimal provider-call shape so tests can inject a fake; web wires the real
 *  `@lumi/profiles` `callOpenRouter`. */
export type OpenRouterCaller = (
  apiKey: string,
  input: OpenRouterCallInput,
) => Promise<OpenRouterCallResult>;

export interface StorySceneGenerationInput {
  hook: StoryHookState;
  /** Injected settings boundary (resolves task/provider settings + key). */
  settingsPort: StorySceneLlmSettingsPort;
  /** Optional bounded continuity source for prior canonical world/NPC state. */
  continuityPort?: StoryContinuityContextPort;
  /** Optional branch scope used by continuity adapters. */
  childProfileId?: string | null;
  characterId?: string | null;
  /** Injected LLM client (defaults to a caller that throws if not provided). */
  callOpenRouter?: OpenRouterCaller;
  /** Max generation attempts on invalid output (default 2). */
  maxAttempts?: number;
}

export interface StorySceneGenerationResult {
  scene: GeneratedScene;
  modelId: string | null;
  attempt: number;
}

/**
 * Generates an LLM-rendered story scene from an accepted hook. Deterministic
 * prompt (hook brief → prompt builder), production LLM path through the
 * injected settings port + caller, optional bounded continuity context, JSON
 * parse + schema validation, and bounded retry with a fresh nonce on invalid
 * output. Pure orchestration: no DB writes.
 */
export class StorySceneGenerationService {
  async generateSceneFromHook(
    input: StorySceneGenerationInput,
  ): Promise<StorySceneGenerationResult> {
    const maxAttempts = input.maxAttempts ?? 2;
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

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const generationNonce = crypto.randomUUID();
      const prompt = buildStoryScenePrompt({
        brief,
        contentBoundary: settings.contentBoundary,
        ageBand: settings.ageBand,
        locale: settings.locale,
        generationNonce,
        continuityContext,
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
        if (invalidContinuityKeys.length === 0) {
          return {
            scene: parsed.scene,
            modelId: response.model || null,
            attempt,
          };
        }

        lastError = new LlmGenerationError(
          `Story scene continuity usage validation failed: unknown keys ${invalidContinuityKeys.join(", ")}`,
        );
        continue;
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
