import { resolveActivePrompt } from "./prompt-runtime.service";
import { generateTextWithLlm } from "./text-llm-gateway.service";
import { parseAndValidatePromptOutput } from "./prompt-output-validator";
import { recordAiGenerationTrace } from "./ai-generation-trace.service";
import { buildGenerationContext } from "./generation-context.service";

export interface WorldCharacterSuggestion {
  key: string;
  name: string;
  description: string;
  fitReason: string;
}

export interface WorldCharacterSuggestionResult {
  suggestions: WorldCharacterSuggestion[];
}

export async function generateWorldCharacterSuggestions(
  userId: string,
  input: { householdId: string; childProfileId: string },
): Promise<WorldCharacterSuggestionResult> {
  const generationContext = await buildGenerationContext(userId, {
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    profile: "character_onboarding",
  });
  if (generationContext.creation.startDirection !== "world_first")
    throw new Error("WORLD_FIRST_CYCLE_REQUIRED");

  const summary = generationContext.creation.previousSelections;
  const worldFeeling = summary.worldFeeling;
  if (typeof worldFeeling !== "string")
    throw new Error("WORLD_FEELING_REQUIRED");

  const context = {
    worldFeeling,
    child: generationContext.child,
    previousSelections: summary,
  };
  const prompt = await resolveActivePrompt(
    "character_onboarding.world_character_suggestions",
    context,
  );
  const generated = await generateTextWithLlm({
    userId,
    householdId: input.householdId,
    taskType: "world_character_suggestions",
    system: prompt.system,
    user: prompt.user,
    modelOverride: prompt.modelOverride,
    generationConfig: prompt.generationConfig,
  });

  let suggestions: WorldCharacterSuggestion[];
  try {
    const value = parseAndValidatePromptOutput(
      generated.content,
      prompt.outputSchema,
    ) as { suggestions: WorldCharacterSuggestion[] };
    suggestions = value.suggestions;
  } catch (error) {
    await recordAiGenerationTrace({
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      creationCycleId: generationContext.creation.cycleId,
      taskType: "world_character_suggestions",
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
    taskType: "world_character_suggestions",
    promptKey: prompt.promptKey,
    promptVersion: prompt.promptVersion,
    inputContext: context,
    outputPayload: { suggestions },
    validationStatus: "valid",
    generated,
  });
  return { suggestions };
}
