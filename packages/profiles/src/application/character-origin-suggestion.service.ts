import { getActiveCharacterCreationCycle } from "./character-creation-cycle.service";
import { resolveActivePrompt } from "./prompt-runtime.service";
import { generateTextWithLlm } from "./text-llm-gateway.service";
import { parseAndValidatePromptOutput } from "./prompt-output-validator";
import { recordAiGenerationTrace } from "./ai-generation-trace.service";

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
  const cycle = await getActiveCharacterCreationCycle(
    userId,
    input.householdId,
    input.childProfileId,
  );
  if (!cycle) throw new Error("CHARACTER_CREATION_CYCLE_REQUIRED");
  const summary = (cycle.latestSummary ?? {}) as Record<string, unknown>;
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
      creationCycleId: cycle.id,
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
    creationCycleId: cycle.id,
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
