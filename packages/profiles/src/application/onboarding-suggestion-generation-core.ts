import { recordAiGenerationTrace } from "./ai-generation-trace.service";
import {
  assembleGenerationContext,
  toPromptGenerationContext,
} from "./generation-context-assembler";
import {
  buildGenerationContext,
  type GenerationCreationOverride,
} from "./generation-context.service";
import { parseAndValidatePromptOutput } from "./prompt-output-validator";
import { resolveActivePrompt } from "./prompt-runtime.service";
import {
  generateTextWithLlm,
  type TextLlmGatewayResult,
} from "./text-llm-gateway.service";

export interface OnboardingSuggestionGenerationSpec<T> {
  promptKey: string;
  taskType: string;
  summaryGuard: (summary: Record<string, unknown>) => void;
  contextExtras?: (
    summary: Record<string, unknown>,
  ) => Record<string, string | number | boolean | null | object>;
  pick: (validated: unknown) => T[];
  maxAttempts?: number;
}

export interface OnboardingSuggestionGenerationOptions {
  creationOverride?: GenerationCreationOverride;
  modelOverride?: string | null;
  recordTrace?: boolean;
}

export interface OnboardingSuggestionGenerationResult<T> {
  suggestions: T[];
  modelId: string;
  promptKey: string;
  promptVersion: number;
  systemPrompt: string;
  userPrompt: string;
  inputContext: Record<
    string,
    string | number | boolean | null | object
  >;
  generated: TextLlmGatewayResult;
}

export async function generateOnboardingSuggestionsWithProductionPipeline<T>(
  userId: string,
  input: { householdId: string; childProfileId: string },
  spec: OnboardingSuggestionGenerationSpec<T>,
  options: OnboardingSuggestionGenerationOptions = {},
): Promise<OnboardingSuggestionGenerationResult<T>> {
  const generationContext = await buildGenerationContext(
    userId,
    {
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      profile: "character_onboarding",
    },
    options.creationOverride,
  );
  const summary = generationContext.creation.previousSelections;
  spec.summaryGuard(summary);

  const assembled = assembleGenerationContext(generationContext);
  const context = {
    ...toPromptGenerationContext(assembled),
    previousSelections: summary,
    locale: generationContext.child.locale,
    ...(spec.contextExtras?.(summary) ?? {}),
  };
  const prompt = await resolveActivePrompt(spec.promptKey, context);
  const maxAttempts = Math.max(1, Math.min(spec.maxAttempts ?? 3, 3));
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const generated = await generateTextWithLlm({
      userId,
      householdId: input.householdId,
      taskType: spec.taskType,
      system: prompt.system,
      user:
        attempt === 1
          ? prompt.user
          : `${prompt.user}\n\nRETRY ${attempt}: Return one complete valid JSON value only. Do not truncate. Use exactly the required schema and root property suggestions. Preserve the requested semantic content and field types.`,
      modelOverride: options.modelOverride ?? prompt.modelOverride,
      generationConfig: prompt.generationConfig,
    });

    try {
      const validated = parseAndValidatePromptOutput(
        generated.content,
        prompt.outputSchema,
      );
      const suggestions = spec.pick(validated);
      if (suggestions.length === 0)
        throw new Error("ONBOARDING_EMPTY_SUGGESTIONS");

      if (options.recordTrace !== false) {
        await recordAiGenerationTrace({
          householdId: input.householdId,
          childProfileId: input.childProfileId,
          creationCycleId: generationContext.creation.cycleId,
          taskType: spec.taskType,
          promptKey: prompt.promptKey,
          promptVersion: prompt.promptVersion,
          inputContext: { ...context, generationAttempt: attempt },
          outputPayload: { suggestions },
          validationStatus: "valid",
          generated,
        });
      }

      return {
        suggestions,
        modelId: generated.model,
        promptKey: prompt.promptKey,
        promptVersion: prompt.promptVersion,
        systemPrompt: prompt.system,
        userPrompt: prompt.user,
        inputContext: context,
        generated,
      };
    } catch (error) {
      lastError = error;
      if (options.recordTrace !== false) {
        await recordAiGenerationTrace({
          householdId: input.householdId,
          childProfileId: input.childProfileId,
          creationCycleId: generationContext.creation.cycleId,
          taskType: spec.taskType,
          promptKey: prompt.promptKey,
          promptVersion: prompt.promptVersion,
          inputContext: { ...context, generationAttempt: attempt },
          outputPayload: { raw: generated.content },
          validationStatus: "invalid",
          generated,
        });
      }
    }
  }

  throw lastError;
}

export function pickSuggestionArray<T>(validated: unknown): T[] {
  const suggestions = (validated as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(suggestions)) throw new Error("ONBOARDING_EMPTY_SUGGESTIONS");
  return suggestions as T[];
}
