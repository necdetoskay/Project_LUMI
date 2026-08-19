import { DrizzleGenerationContextSnapshotStore } from "../db/repositories";
import {
  createAiGenerationContextTraceEvidence,
  recordAiGenerationTrace,
} from "./ai-generation-trace.service";
import { getProfileDb } from "./db";
import {
  assembleGenerationContext,
  toPromptGenerationContext,
} from "./generation-context-assembler";
import { materializeGenerationContextSnapshots } from "./generation-context-snapshot.service";
import {
  buildGenerationContext,
  type GenerationContext,
  type GenerationCreationOverride,
} from "./generation-context.service";
import {
  parseAndValidatePromptOutput,
  type JsonSchema,
} from "./prompt-output-validator";
import {
  resolveActivePrompt,
  resolvePromptVersion,
} from "./prompt-runtime.service";
import {
  generateTextWithLlm,
  type TextLlmGatewayResult,
} from "./text-llm-gateway.service";

export interface OnboardingSuggestionGenerationSpec<T> {
  promptKey: string;
  taskType: string;
  generationGuard?: (context: GenerationContext) => void;
  summaryGuard: (summary: Record<string, unknown>) => void;
  contextExtras?: (
    summary: Record<string, unknown>,
  ) => Record<string, string | number | boolean | null | object>;
  pick: (validated: unknown) => T[];
  maxAttempts?: number;
}

export interface OnboardingPromptOverride {
  system?: string;
  user?: string;
}

export interface OnboardingSuggestionGenerationOptions {
  creationOverride?: GenerationCreationOverride;
  modelOverride?: string | null;
  promptVersionOverride?: number;
  promptOverride?: OnboardingPromptOverride;
  localeOverride?: string;
  recordTrace?: boolean;
}

export interface PreparedOnboardingSuggestionPrompt {
  promptKey: string;
  promptVersion: number;
  systemTemplate: string;
  userTemplate: string;
  systemPrompt: string;
  userPrompt: string;
  outputSchema: JsonSchema;
  modelOverride: string | null;
  generationConfig: Record<string, unknown> | null;
  inputContext: Record<string, string | number | boolean | null | object>;
  generationContext: GenerationContext;
  contextEvidence: ReturnType<typeof createAiGenerationContextTraceEvidence>;
}

export interface OnboardingSuggestionGenerationResult<T> {
  suggestions: T[];
  modelId: string;
  promptKey: string;
  promptVersion: number;
  systemTemplate: string;
  userTemplate: string;
  systemPrompt: string;
  userPrompt: string;
  inputContext: Record<string, string | number | boolean | null | object>;
  generated: TextLlmGatewayResult;
}

export async function prepareOnboardingSuggestionPrompt<T>(
  userId: string,
  input: { householdId: string; childProfileId: string },
  spec: OnboardingSuggestionGenerationSpec<T>,
  options: OnboardingSuggestionGenerationOptions = {},
): Promise<PreparedOnboardingSuggestionPrompt> {
  const generationContext = await buildGenerationContext(
    userId,
    {
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      profile: "character_onboarding",
    },
    options.creationOverride,
  );
  spec.generationGuard?.(generationContext);
  const summary = generationContext.creation.previousSelections;
  spec.summaryGuard(summary);

  const rawAssembled = assembleGenerationContext(generationContext);
  const assembled =
    options.recordTrace === false
      ? rawAssembled
      : await materializeGenerationContextSnapshots(
          rawAssembled,
          new DrizzleGenerationContextSnapshotStore(getProfileDb()),
        );
  const contextEvidence = createAiGenerationContextTraceEvidence(assembled);
  const effectiveLocale =
    options.localeOverride?.trim() || generationContext.child.locale || "en";
  const context = {
    ...toPromptGenerationContext(assembled),
    previousSelections: summary,
    locale: effectiveLocale,
    ...(spec.contextExtras?.(summary) ?? {}),
  };
  const prompt =
    options.promptVersionOverride === undefined
      ? await resolveActivePrompt(spec.promptKey, context)
      : await resolvePromptVersion(
          spec.promptKey,
          options.promptVersionOverride,
          context,
        );
  const languageInstruction = outputLanguageInstruction(effectiveLocale);
  const finalSystemPrompt = options.promptOverride?.system ?? prompt.system;
  const finalUserPrompt =
    options.promptOverride?.user ?? `${prompt.user}\n\n${languageInstruction}`;

  return {
    promptKey: prompt.promptKey,
    promptVersion: prompt.promptVersion,
    systemTemplate: prompt.systemTemplate,
    userTemplate: prompt.userTemplate,
    systemPrompt: finalSystemPrompt,
    userPrompt: finalUserPrompt,
    outputSchema: prompt.outputSchema,
    modelOverride: options.modelOverride ?? prompt.modelOverride,
    generationConfig: prompt.generationConfig,
    inputContext: context,
    generationContext,
    contextEvidence,
  };
}

export async function generateOnboardingSuggestionsWithProductionPipeline<T>(
  userId: string,
  input: { householdId: string; childProfileId: string },
  spec: OnboardingSuggestionGenerationSpec<T>,
  options: OnboardingSuggestionGenerationOptions = {},
): Promise<OnboardingSuggestionGenerationResult<T>> {
  const prepared = await prepareOnboardingSuggestionPrompt(
    userId,
    input,
    spec,
    options,
  );
  const maxAttempts = Math.max(1, Math.min(spec.maxAttempts ?? 3, 3));
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const generated = await generateTextWithLlm({
      userId,
      householdId: input.householdId,
      taskType: spec.taskType,
      system: prepared.systemPrompt,
      user:
        attempt === 1
          ? prepared.userPrompt
          : `${prepared.userPrompt}\n\nRETRY ${attempt}: Return one complete valid JSON value only. Do not truncate. Use exactly the required schema and root property suggestions. Preserve the requested semantic content and field types.`,
      modelOverride: prepared.modelOverride,
      generationConfig: prepared.generationConfig,
    });

    try {
      const validated = parseAndValidatePromptOutput(
        generated.content,
        prepared.outputSchema,
      );
      const suggestions = spec.pick(validated);
      if (suggestions.length === 0)
        throw new Error("ONBOARDING_EMPTY_SUGGESTIONS");

      if (options.recordTrace !== false) {
        await recordAiGenerationTrace({
          householdId: input.householdId,
          childProfileId: input.childProfileId,
          creationCycleId: prepared.generationContext.creation.cycleId,
          taskType: spec.taskType,
          promptKey: prepared.promptKey,
          promptVersion: prepared.promptVersion,
          inputContext: {
            ...prepared.inputContext,
            generationAttempt: attempt,
          },
          contextEvidence: prepared.contextEvidence,
          outputPayload: { suggestions },
          validationStatus: "valid",
          generated,
        });
      }

      return {
        suggestions,
        modelId: generated.model,
        promptKey: prepared.promptKey,
        promptVersion: prepared.promptVersion,
        systemTemplate: prepared.systemTemplate,
        userTemplate: prepared.userTemplate,
        systemPrompt: prepared.systemPrompt,
        userPrompt: prepared.userPrompt,
        inputContext: prepared.inputContext,
        generated,
      };
    } catch (error) {
      lastError = error;
      if (options.recordTrace !== false) {
        await recordAiGenerationTrace({
          householdId: input.householdId,
          childProfileId: input.childProfileId,
          creationCycleId: prepared.generationContext.creation.cycleId,
          taskType: spec.taskType,
          promptKey: prepared.promptKey,
          promptVersion: prepared.promptVersion,
          inputContext: {
            ...prepared.inputContext,
            generationAttempt: attempt,
          },
          contextEvidence: prepared.contextEvidence,
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
  if (!Array.isArray(suggestions))
    throw new Error("ONBOARDING_EMPTY_SUGGESTIONS");
  return suggestions as T[];
}

function outputLanguageInstruction(locale: string): string {
  const normalized = locale.toLowerCase();
  if (normalized === "tr" || normalized.startsWith("tr-")) {
    return "OUTPUT LANGUAGE: Turkish. Write every user-visible value in Turkish. Keep technical JSON property names, stable keys, IDs, enum values, and machine-readable identifiers unchanged. Names may remain proper names. Do not translate JSON keys.";
  }
  if (normalized === "en" || normalized.startsWith("en-")) {
    return "OUTPUT LANGUAGE: English. Write every user-visible value in English. Keep technical JSON property names, stable keys, IDs, enum values, and machine-readable identifiers unchanged. Do not translate JSON keys.";
  }
  return `OUTPUT LANGUAGE: ${locale}. Write every user-visible value in this language. Keep technical JSON property names, stable keys, IDs, enum values, and machine-readable identifiers unchanged. Do not translate JSON keys.`;
}
