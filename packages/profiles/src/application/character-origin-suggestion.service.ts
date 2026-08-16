import { resolveActivePrompt } from "./prompt-runtime.service";
import { generateTextWithLlm } from "./text-llm-gateway.service";
import { parseAndValidatePromptOutput } from "./prompt-output-validator";
import { recordAiGenerationTrace } from "./ai-generation-trace.service";
import { buildGenerationContext } from "./generation-context.service";
import {
  assembleGenerationContext,
  toPromptGenerationContext,
} from "./generation-context-assembler";

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
  const canonicalFoundation = Boolean(
    summary.world && summary.region && summary.characterIdentity,
  );
  const legacyWorldFirst = Boolean(
    typeof summary.worldFeeling === "string" &&
      summary.characterArchetype &&
      summary.characterIdentity,
  );
  if (!canonicalFoundation && !legacyWorldFirst)
    throw new Error("CHARACTER_ORIGIN_CONTEXT_REQUIRED");

  const world = summary.world as
    | { name?: string; ecology?: string; adventureTone?: string }
    | undefined;
  const region = summary.region as
    | { name?: string; biome?: string; description?: string }
    | undefined;
  const assembledContext = assembleGenerationContext(generationContext);
  const context = {
    ...toPromptGenerationContext(assembledContext),
    worldFeeling:
      typeof summary.worldFeeling === "string"
        ? summary.worldFeeling
        : `${world?.name ?? "selected world"}; ${world?.ecology ?? ""}; ${world?.adventureTone ?? ""}`,
    characterArchetype: summary.characterArchetype ?? {
      characterType: summary.characterType,
      world,
      region,
    },
    characterIdentity: summary.characterIdentity as object,
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
    if (!suggestions.length) throw new Error("ONBOARDING_EMPTY_SUGGESTIONS");
  } catch (error) {
    await recordAiGenerationTrace({
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      creationCycleId: generationContext.creation.cycleId,
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
    creationCycleId: generationContext.creation.cycleId,
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
