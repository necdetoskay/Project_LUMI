import { getProfileDb } from "./db";
import { aiGenerationTraces } from "../db/schema/profile";
import { getActiveCharacterCreationCycle } from "./character-creation-cycle.service";
import { resolveActivePrompt } from "./prompt-runtime.service";
import { generateTextWithLlm } from "./text-llm-gateway.service";
import { parseAndValidatePromptOutput } from "./prompt-output-validator";

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
  const cycle = await getActiveCharacterCreationCycle(
    userId,
    input.householdId,
    input.childProfileId,
  );
  if (!cycle) throw new Error("CHARACTER_CREATION_CYCLE_REQUIRED");

  const summary = (cycle.latestSummary ?? {}) as Record<string, unknown>;
  if (typeof summary.worldFeeling !== "string" || !summary.characterArchetype)
    throw new Error("CHARACTER_IDENTITY_CONTEXT_REQUIRED");

  const context = {
    worldFeeling: summary.worldFeeling,
    characterArchetype: summary.characterArchetype,
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
    await getProfileDb().insert(aiGenerationTraces).values({
      id: crypto.randomUUID(),
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      creationCycleId: cycle.id,
      taskType: "character_identity_suggestions",
      promptKey: prompt.promptKey,
      promptVersion: prompt.promptVersion,
      provider: generated.provider,
      modelId: generated.model,
      inputContext: context,
      outputPayload: { raw: generated.content },
      validationStatus: "invalid",
      promptTokens: generated.promptTokens,
      completionTokens: generated.completionTokens,
      totalTokens: generated.totalTokens,
      latencyMs: generated.latencyMs,
    });
    throw error;
  }

  await getProfileDb().insert(aiGenerationTraces).values({
    id: crypto.randomUUID(),
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    creationCycleId: cycle.id,
    taskType: "character_identity_suggestions",
    promptKey: prompt.promptKey,
    promptVersion: prompt.promptVersion,
    provider: generated.provider,
    modelId: generated.model,
    inputContext: context,
    outputPayload: { suggestions },
    validationStatus: "valid",
    promptTokens: generated.promptTokens,
    completionTokens: generated.completionTokens,
    totalTokens: generated.totalTokens,
    latencyMs: generated.latencyMs,
  });

  return { suggestions };
}
