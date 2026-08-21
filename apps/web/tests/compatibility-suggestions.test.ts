import { describe, expect, it } from "vitest";

import {
  MAX_COMPATIBILITY_GENERATION_ATTEMPTS,
  progressableCompatibilitySuggestions,
} from "@/lib/character-onboarding/compatibility-suggestions";

describe("compatibility suggestions", () => {
  it("keeps only suggestions that the canonical selection service can accept", () => {
    const suggestions = progressableCompatibilitySuggestions([
      { key: "natural", classification: "natural" as const },
      {
        key: "explainable",
        classification: "requires_explanation" as const,
      },
      { key: "low", classification: "low" as const },
      { key: "blocked", classification: "incompatible" as const },
    ]);

    expect(suggestions.map((suggestion) => suggestion.key)).toEqual([
      "natural",
      "explainable",
      "low",
    ]);
  });

  it("returns an empty window when a model batch contains only incompatible suggestions", () => {
    expect(
      progressableCompatibilitySuggestions([
        { key: "candidate-1", classification: "incompatible" as const },
      ]),
    ).toEqual([]);
  });

  it("keeps semantic regeneration bounded", () => {
    expect(MAX_COMPATIBILITY_GENERATION_ATTEMPTS).toBe(3);
  });
});
