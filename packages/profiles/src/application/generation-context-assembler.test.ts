import { describe, expect, it } from "vitest";

import {
  assembleGenerationContext,
  estimateGenerationContextTokens,
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
    expect(assembled.droppedSections).toEqual([]);
    expect(assembled.estimatedTokens).toBeLessThanOrEqual(1800);
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

  it("estimates tokens deterministically", () => {
    const value = { interests: ["space", "crystals"], locale: "tr-TR" };

    expect(estimateGenerationContextTokens(value)).toBe(
      estimateGenerationContextTokens(value),
    );
    expect(estimateGenerationContextTokens(value)).toBeGreaterThan(0);
  });

  it("drops lower priority sections before required sections when budget is tight", () => {
    const source = context("character_onboarding");
    source.creation.previousSelections = {
      worldFeeling: "crystal_caves",
      flavor: "x".repeat(1200),
    };

    const baseline = assembleGenerationContext(source);
    const requiredTokens = baseline.sections
      .filter((section) => section.priority === "required")
      .reduce((total, section) => total + section.estimatedTokens, 0);
    const assembled = assembleGenerationContext(source, {
      maxContextTokens: requiredTokens,
    });

    expect(assembled.sections.every((section) => section.priority === "required")).toBe(
      true,
    );
    expect(assembled.droppedSections).toContain("creation_selections");
    expect(assembled.estimatedTokens).toBeLessThanOrEqual(requiredTokens);
  });

  it("fails safely instead of silently dropping required context", () => {
    expect(() =>
      assembleGenerationContext(context("character_onboarding"), {
        maxContextTokens: 1,
      }),
    ).toThrow(/GENERATION_CONTEXT_REQUIRED_BUDGET_EXCEEDED/);
  });

  it("produces the same budget decision for the same input", () => {
    const first = assembleGenerationContext(context("character_onboarding"), {
      maxContextTokens: 80,
    });
    const second = assembleGenerationContext(context("character_onboarding"), {
      maxContextTokens: 80,
    });

    expect(second).toEqual(first);
  });
});
