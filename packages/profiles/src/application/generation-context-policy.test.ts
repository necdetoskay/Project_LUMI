import { describe, expect, it } from "vitest";

import {
  assertGenerationContextPolicy,
  getGenerationContextPolicy,
  getGenerationContextSectionPolicy,
} from "./generation-context-policy";

describe("generation context policy", () => {
  it("keeps character onboarding focused on child and current creation choices", () => {
    const policy = getGenerationContextPolicy("character_onboarding");

    expect(policy.maxContextTokens).toBe(1800);
    expect(policy.sections.map((entry) => entry.section)).toEqual([
      "child_identity",
      "child_personalization",
      "creation_direction",
      "creation_selections",
    ]);
    expect(
      getGenerationContextSectionPolicy("character_onboarding", "world_state"),
    ).toBeNull();
  });

  it("reserves richer continuity context for story generation", () => {
    const policy = getGenerationContextPolicy("story_generation");

    expect(policy.maxContextTokens).toBe(5200);
    expect(
      getGenerationContextSectionPolicy("story_generation", "character_state")
        ?.priority,
    ).toBe("required");
    expect(
      getGenerationContextSectionPolicy(
        "story_generation",
        "relevant_memories",
      )?.priority,
    ).toBe("medium");
  });

  it("rejects policies whose section budgets exceed the profile budget", () => {
    expect(() =>
      assertGenerationContextPolicy({
        profile: "character_onboarding",
        maxContextTokens: 100,
        sections: [
          { section: "child_identity", priority: "required", maxTokens: 60 },
          {
            section: "child_personalization",
            priority: "required",
            maxTokens: 60,
          },
        ],
      }),
    ).toThrow(/exceed profile budget/);
  });
});
