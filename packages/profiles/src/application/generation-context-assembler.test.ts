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
      ageYears: 7,
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

  it("rejects a required section when its canonical value is missing", () => {
    expect(() =>
      assembleGenerationContext(context("story_generation")),
    ).toThrow("GENERATION_CONTEXT_REQUIRED_SOURCE_MISSING:character_state");
  });

  it("keeps a required structured personalization source when its collections are empty", () => {
    const source = context("character_onboarding");
    source.child.interests = [];
    source.child.customInterests = [];
    source.child.developmentGoals = [];

    const assembled = assembleGenerationContext(source);
    const promptContext = toPromptGenerationContext(assembled);

    expect(promptContext.child_personalization).toEqual({
      interests: [],
      customInterests: [],
      developmentGoals: [],
    });
  });

  it("removes internal child and creation-cycle ids from provider-visible context", () => {
    const promptContext = toPromptGenerationContext(
      assembleGenerationContext(context("character_onboarding")),
    );

    expect(promptContext).toEqual({
      child_identity: {
        ageBand: "6-8",
        ageYears: 7,
        locale: "tr-TR",
      },
      child_personalization: {
        interests: ["space"],
        customInterests: ["crystals"],
        developmentGoals: ["curiosity"],
      },
      creation_direction: {
        startDirection: "world_first",
      },
      creation_selections: { worldFeeling: "crystal_caves" },
    });
    expect(JSON.stringify(promptContext)).not.toContain("child-1");
    expect(JSON.stringify(promptContext)).not.toContain("cycle-1");
  });

  it("estimates tokens deterministically", () => {
    const value = { interests: ["space", "crystals"], locale: "tr-TR" };

    expect(estimateGenerationContextTokens(value)).toBe(
      estimateGenerationContextTokens(value),
    );
    expect(estimateGenerationContextTokens(value)).toBeGreaterThan(0);
  });

  it("drops an oversized optional section instead of undercounting its payload", () => {
    const source = context("character_onboarding");
    source.creation.previousSelections = {
      worldFeeling: "crystal_caves",
      flavor: "x".repeat(4_000),
    };

    const assembled = assembleGenerationContext(source);
    const promptContext = toPromptGenerationContext(assembled);

    expect(assembled.droppedSections).toContain("creation_selections");
    expect(promptContext).not.toHaveProperty("creation_selections");
    expect(assembled.estimatedTokens).toBeLessThanOrEqual(
      assembled.maxContextTokens,
    );
  });

  it("rejects an oversized required section instead of clipping accounting only", () => {
    const source = context("character_onboarding");
    source.child.interests = ["x".repeat(4_000)];

    expect(() => assembleGenerationContext(source)).toThrow(
      /GENERATION_CONTEXT_REQUIRED_SECTION_BUDGET_EXCEEDED:child_personalization/,
    );
  });

  it("drops lower priority sections before required sections when total budget is tight", () => {
    const source = context("character_onboarding");
    const baseline = assembleGenerationContext(source);
    const requiredOnly = baseline.sections.filter(
      (section) => section.priority === "required",
    );
    const requiredPromptTokens = estimateGenerationContextTokens(
      Object.fromEntries(
        requiredOnly.map((section) => [section.section, section.value]),
      ),
    );
    const assembled = assembleGenerationContext(source, {
      maxContextTokens: requiredPromptTokens,
    });

    expect(
      assembled.sections.every((section) => section.priority === "required"),
    ).toBe(true);
    expect(assembled.droppedSections).toContain("creation_selections");
    expect(assembled.estimatedTokens).toBeLessThanOrEqual(requiredPromptTokens);
  });

  it("fails safely instead of silently dropping required context", () => {
    expect(() =>
      assembleGenerationContext(context("character_onboarding"), {
        maxContextTokens: 1,
      }),
    ).toThrow(/GENERATION_CONTEXT_REQUIRED_BUDGET_EXCEEDED/);
  });

  it("verifies the final provider-bound payload against the total budget", () => {
    const assembled = assembleGenerationContext(
      context("character_onboarding"),
    );
    const promptContext = toPromptGenerationContext(assembled);

    expect(estimateGenerationContextTokens(promptContext)).toBe(
      assembled.estimatedTokens,
    );
    expect(assembled.estimatedTokens).toBeLessThanOrEqual(
      assembled.maxContextTokens,
    );
  });

  it("produces the same budget decision for the same input", () => {
    const first = assembleGenerationContext(context("character_onboarding"), {
      maxContextTokens: 160,
    });
    const second = assembleGenerationContext(context("character_onboarding"), {
      maxContextTokens: 160,
    });

    expect(second).toEqual(first);
  });
});
