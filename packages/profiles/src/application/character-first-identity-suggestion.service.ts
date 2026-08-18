import type { CharacterIdentitySuggestion } from "./character-identity-suggestion.service";
import {
  generateOnboardingSuggestionsWithProductionPipeline,
  pickSuggestionArray,
  type OnboardingSuggestionGenerationOptions,
} from "./onboarding-suggestion-generation-core";

export async function generateCharacterFirstIdentitySuggestions(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: OnboardingSuggestionGenerationOptions = {},
): Promise<{ suggestions: CharacterIdentitySuggestion[]; modelId: string }> {
  const result = await generateOnboardingSuggestionsWithProductionPipeline(
    userId,
    input,
    {
      promptKey: "character_onboarding.character_first_identity_suggestions",
      taskType: "character_identity_suggestions",
      summaryGuard(summary) {
        if (!summary.characterType)
          throw new Error("CHARACTER_TYPE_CONTEXT_REQUIRED");
      },
      contextExtras: (summary) => ({
        characterType: summary.characterType as object,
      }),
      pick: pickSuggestionArray<CharacterIdentitySuggestion>,
    },
    options,
  );

  return { suggestions: result.suggestions, modelId: result.modelId };
}
