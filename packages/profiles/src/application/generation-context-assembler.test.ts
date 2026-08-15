import { describe, expect, it } from "vitest";

import {
  assembleGenerationContext,
  toPromptGenerationContext,
} from "./generation-context-assembler";
import type { GenerationContext } from "./generation-context.service";

function context(profile: GenerationContext["profile"]): GenerationContext {
  return {
    profile,
    child: {
      id: "child-1",
      ageBand: "6-8",
      locale: "tr-TR",
      interests: ["space"],
      customInterests: ["crystals"],
      developmentGoals: ["curiosity"],
    },
    creation: {
      cycleId: "cycle-1",
      startDirection: "world_first",
      previousSelections: { worldFeeling: "crystal_caves" },
    },
  };
}

describe("generation context assembler", () => {
  it("assembles only sections allowed by the onboarding policy", () => {
    const assembled = assembleGenerationContext(
      context("character_onboarding"),
    );

    expect(assembled.maxContextTokens).toBe(1800);
    expect(assembled.sections.map((entry) => entry.section)).toEqual([
      "child_identity",
      "child_personalization",
      "creation_direction",
      "creation_selections",
    ]);
  });

  it("keeps required future sections visible while optional empty sections are omitted", () => {
    const assembled = assembleGenerationContext(context("story_generation"));

    expect(assembled.sections.map((entry) => entry.section)).toEqual([
      "child_identity",
      "child_personalization",
      "character_state",
    ]);
    expect(
      assembled.sections.find((entry) => entry.section === "character_state")
        ?.value,
    ).toBeNull();
  });

  it("converts assembled sections into stable prompt context keys", () => {
    const promptContext = toPromptGenerationContext(
      assembleGenerationContext(context("character_onboarding")),
    );

    expect(promptContext).toEqual({
      child_identity: {
        id: "child-1",
        ageBand: "6-8",
        locale: "tr-TR",
      },
      child_personalization: {
        interests: ["space"],
        customInterests: ["crystals"],
        developmentGoals: ["curiosity"],
      },
      creation_direction: {
        cycleId: "cycle-1",
        startDirection: "world_first",
      },
      creation_selections: { worldFeeling: "crystal_caves" },
    });
  });
});
