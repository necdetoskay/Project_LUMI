export type CompatibilityClassification =
  | "natural"
  | "requires_explanation"
  | "low"
  | "incompatible";

export type CompatibilitySuggestionLike = {
  key: string;
  classification: CompatibilityClassification;
};

export const MAX_COMPATIBILITY_GENERATION_ATTEMPTS = 3;

export function progressableCompatibilitySuggestions<
  T extends CompatibilitySuggestionLike,
>(suggestions: T[]): T[] {
  return suggestions.filter(
    (suggestion) => suggestion.classification !== "incompatible",
  );
}
