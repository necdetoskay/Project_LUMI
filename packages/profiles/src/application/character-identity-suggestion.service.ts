import { resolveActivePrompt } from "./prompt-runtime.service";
import { generateTextWithLlm } from "./text-llm-gateway.service";
import { parseAndValidatePromptOutput } from "./prompt-output-validator";
import { recordAiGenerationTrace } from "./ai-generation-trace.service";
import { buildGenerationContext } from "./generation-context.service";

export interface CharacterIdentitySuggestion {
  key: string;
  name: string;
  identity: string;
  traits: [string, string, string];
  fitReason: string;
}

export interface CharacterIdentitySuggestionResult {
  suggestions: CharacterIdentitySuggestion[];
}

export async function generateCharacterIdentitySuggestions(
  userId: string,
  input: { householdId: string; childProfileId: string },
): Promise<CharacterIdentitySuggestionResult> {
  const generationContext = await buildGenerationContext(userId, {
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    profile: "character_onboarding",
  });
  const summary = generationContext.creation.previousSelections;
  if (typeof summary.worldFeeling !== "string" || !summary.characterArchetype)
    throw new Error("CHARACTER_IDENTITY_CONTEXT_REQUIRED");
  const context = {
    worldFeeling: summary.worldFeeling,
    characterArchetype: summary.characterArchetype,
    child: generationContext.child,
    previousSelections: summary,
  };
  const prompt = await resolveActivePrompt(
    "character_onboarding.character_identity_suggestions",
    context,
  );
  const generated = await generateTextWithLlm({
    userId,
    householdId: input.householdId,
    taskType: "character_identity_suggestions",
    system: prompt.system,
    user: prompt.user,
    modelOverride: prompt.modelOverride,
    generationConfig: prompt.generationConfig,
  });
  let suggestions: CharacterIdentitySuggestion[];
  try {
    const value = parseAndValidatePromptOutput(
      generated.content,
      prompt.outputSchema,
    ) as { suggestions: CharacterIdentitySuggestion[] };
    suggestions = value.suggestions;
  } catch (error) {
    await recordAiGenerationTrace({
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      creationCycleId: generationContext.creation.cycleId,
      taskType: "character_identity_suggestions",
      promptKey: prompt.promptKey,
      promptVersion: prompt.promptVersion,
      inputContext: context,
      outputPayload: { raw: generated.content },
      validationStatus: "invalid",
      generated,
    });
    throw error;
  }
  await recordAiGenerationTrace({
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    creationCycleId: generationContext.creation.cycleId,
    taskType: "character_identity_suggestions",
    promptKey: prompt.promptKey,
    promptVersion: prompt.promptVersion,
    inputContext: context,
    outputPayload: { suggestions },
    validationStatus: "valid",
    generated,
  });
  return { suggestions };
}
