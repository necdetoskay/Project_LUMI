import { resolveActivePrompt } from "./prompt-runtime.service";
import { generateTextWithLlm } from "./text-llm-gateway.service";
import { parseAndValidatePromptOutput } from "./prompt-output-validator";
import { recordAiGenerationTrace } from "./ai-generation-trace.service";
import { buildGenerationContext } from "./generation-context.service";

export interface CharacterOriginSuggestion {
  key: string;
  title: string;
  origin: string;
  home: string;
  formativeExperience: string;
  storyHook: string;
}

export interface CharacterOriginSuggestionResult {
  suggestions: CharacterOriginSuggestion[];
}

export async function generateCharacterOriginSuggestions(
  userId: string,
  input: { householdId: string; childProfileId: string },
): Promise<CharacterOriginSuggestionResult> {
  const generationContext = await buildGenerationContext(userId, {
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    profile: "character_onboarding",
  });
  const summary = generationContext.creation.previousSelections;
  if (
    typeof summary.worldFeeling !== "string" ||
    !summary.characterArchetype ||
    !summary.characterIdentity
  )
    throw new Error("CHARACTER_ORIGIN_CONTEXT_REQUIRED");
  const context = {
    worldFeeling: summary.worldFeeling,
    characterArchetype: summary.characterArchetype,
    characterIdentity: summary.characterIdentity,
    child: generationContext.child,
    previousSelections: summary,
  };
  const prompt = await resolveActivePrompt(
    "character_onboarding.character_origin_suggestions",
    context,
  );
  const generated = await generateTextWithLlm({
    userId,
    householdId: input.householdId,
    taskType: "character_origin_suggestions",
    system: prompt.system,
    user: prompt.user,
    modelOverride: prompt.modelOverride,
    generationConfig: prompt.generationConfig,
  });
  let suggestions: CharacterOriginSuggestion[];
  try {
    const value = parseAndValidatePromptOutput(
      generated.content,
      prompt.outputSchema,
    ) as { suggestions: CharacterOriginSuggestion[] };
    suggestions = value.suggestions;
  } catch (error) {
    await recordAiGenerationTrace({
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      creationCycleId: generationContext.creation.cycleId ?? undefined,
      taskType: "character_origin_suggestions",
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
    creationCycleId: generationContext.creation.cycleId ?? undefined,
    taskType: "character_origin_suggestions",
    promptKey: prompt.promptKey,
    promptVersion: prompt.promptVersion,
    inputContext: context,
    outputPayload: { suggestions },
    validationStatus: "valid",
    generated,
  });
  return { suggestions };
}
