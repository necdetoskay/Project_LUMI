import { recordAiGenerationTrace } from "./ai-generation-trace.service";
import {
  assembleGenerationContext,
  toPromptGenerationContext,
} from "./generation-context-assembler";
import { buildGenerationContext } from "./generation-context.service";
import { parseAndValidatePromptOutput } from "./prompt-output-validator";
import { resolveActivePrompt } from "./prompt-runtime.service";
import { generateTextWithLlm } from "./text-llm-gateway.service";
import type { CharacterIdentitySuggestion } from "./character-identity-suggestion.service";

export async function generateCharacterFirstIdentitySuggestions(
  userId: string,
  input: { householdId: string; childProfileId: string },
): Promise<{ suggestions: CharacterIdentitySuggestion[]; modelId: string }> {
  const generationContext = await buildGenerationContext(userId, {
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    profile: "character_onboarding",
  });
  const summary = generationContext.creation.previousSelections;
  if (!summary.characterType)
    throw new Error("CHARACTER_TYPE_CONTEXT_REQUIRED");
  const assembled = assembleGenerationContext(generationContext);
  const context = {
    ...toPromptGenerationContext(assembled),
    characterType: summary.characterType as object,
    previousSelections: summary,
  };
  const prompt = await resolveActivePrompt(
    "character_onboarding.character_first_identity_suggestions",
    context,
  );

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const generated = await generateTextWithLlm({
      userId,
      householdId: input.householdId,
      taskType: "character_identity_suggestions",
      system: prompt.system,
      user:
        attempt === 1
          ? prompt.user
          : `${prompt.user}\n\nRETRY ${attempt}: Return one complete valid JSON value only. Do not truncate. Use exactly the required schema and root property suggestions.`,
      modelOverride: prompt.modelOverride,
      generationConfig: prompt.generationConfig,
    });
    try {
      const parsed = parseAndValidatePromptOutput(
        generated.content,
        prompt.outputSchema,
      ) as { suggestions: CharacterIdentitySuggestion[] };
      if (!parsed.suggestions.length)
        throw new Error("ONBOARDING_EMPTY_SUGGESTIONS");
      await recordAiGenerationTrace({
        householdId: input.householdId,
        childProfileId: input.childProfileId,
        creationCycleId: generationContext.creation.cycleId,
        taskType: "character_identity_suggestions",
        promptKey: prompt.promptKey,
        promptVersion: prompt.promptVersion,
        inputContext: { ...context, generationAttempt: attempt },
        outputPayload: { suggestions: parsed.suggestions },
        validationStatus: "valid",
        generated,
      });
      return { suggestions: parsed.suggestions, modelId: generated.model };
    } catch (error) {
      lastError = error;
      await recordAiGenerationTrace({
        householdId: input.householdId,
        childProfileId: input.childProfileId,
        creationCycleId: generationContext.creation.cycleId,
        taskType: "character_identity_suggestions",
        promptKey: prompt.promptKey,
        promptVersion: prompt.promptVersion,
        inputContext: { ...context, generationAttempt: attempt },
        outputPayload: { raw: generated.content },
        validationStatus: "invalid",
        generated,
      });
    }
  }
  throw lastError;
}
