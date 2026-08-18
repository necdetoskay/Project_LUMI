import { describe, expect, it } from "vitest";

import { assembleGenerationContext } from "./generation-context-assembler";
import type { GenerationContext } from "./generation-context.service";
import {
  createGenerationContextSourceRegistry,
  getDefaultGenerationContextSources,
  type GenerationContextSource,
} from "./generation-context-source";

function onboardingContext(): GenerationContext {
  return {
    profile: "character_onboarding",
    child: {
      id: "internal-child-id",
      ageBand: "6-8",
      ageYears: 7,
      locale: "tr-TR",
      interests: ["space"],
      customInterests: [],
      developmentGoals: ["curiosity"],
    },
    creation: {
      cycleId: "internal-cycle-id",
      startDirection: "world_first",
      previousSelections: { worldFeeling: "crystal_caves" },
    },
  };
}

function source(
  section: GenerationContextSource["section"],
  value: unknown,
): GenerationContextSource {
  return {
    section,
    source: `test.${section}`,
    authority: "derived",
    resolve: () => ({ value }),
  };
}

describe("generation context sources", () => {
  it("registers one canonical source for every current generation section", () => {
    const registry = createGenerationContextSourceRegistry();

    expect([...registry.keys()]).toEqual([
      "child_identity",
      "child_personalization",
      "creation_direction",
      "creation_selections",
      "character_state",
      "world_state",
      "recent_story_state",
      "relevant_memories",
    ]);
  });

  it("rejects duplicate source ownership for the same section", () => {
    const childIdentity = getDefaultGenerationContextSources().find(
      (entry) => entry.section === "child_identity",
    );
    expect(childIdentity).toBeDefined();

    expect(() =>
      createGenerationContextSourceRegistry([
        childIdentity!,
        { ...childIdentity!, source: "duplicate.child" },
      ]),
    ).toThrow("GENERATION_CONTEXT_SOURCE_DUPLICATE:child_identity");
  });

  it("lets the assembler resolve policy sections through injected sources", () => {
    const assembled = assembleGenerationContext(onboardingContext(), {
      sources: [
        source("child_identity", {
          ageBand: "6-8",
          ageYears: 7,
          locale: "tr-TR",
        }),
        source("child_personalization", { interests: ["oceans"] }),
        source("creation_direction", { startDirection: "character_first" }),
        source("creation_selections", { worldFeeling: "floating_islands" }),
      ],
    });

    expect(assembled.sections.map((entry) => entry.value)).toEqual([
      { ageBand: "6-8", ageYears: 7, locale: "tr-TR" },
      { interests: ["oceans"] },
      { startDirection: "character_first" },
      { worldFeeling: "floating_islands" },
    ]);
  });

  it("fails explicitly when a required policy section has no registered source", () => {
    expect(() =>
      assembleGenerationContext(onboardingContext(), {
        sources: [
          source("child_identity", { ageBand: "6-8" }),
          source("child_personalization", { interests: ["space"] }),
        ],
      }),
    ).toThrow("GENERATION_CONTEXT_SOURCE_UNREGISTERED:creation_direction");
  });

  it("fails a required source error with source identity", () => {
    const failingSource: GenerationContextSource = {
      section: "child_identity",
      source: "test.failing-child",
      authority: "canonical",
      resolve() {
        throw new Error("reader unavailable");
      },
    };

    expect(() =>
      assembleGenerationContext(onboardingContext(), {
        sources: [
          failingSource,
          source("child_personalization", { interests: ["space"] }),
          source("creation_direction", { startDirection: "world_first" }),
          source("creation_selections", { worldFeeling: "crystal_caves" }),
        ],
      }),
    ).toThrow(
      "GENERATION_CONTEXT_SOURCE_FAILED:child_identity:test.failing-child:reader unavailable",
    );
  });

  it("drops a failing optional source without weakening required sections", () => {
    const failingOptional: GenerationContextSource = {
      section: "creation_selections",
      source: "test.failing-selections",
      authority: "derived",
      resolve() {
        throw new Error("optional unavailable");
      },
    };

    const assembled = assembleGenerationContext(onboardingContext(), {
      sources: [
        source("child_identity", { ageBand: "6-8" }),
        source("child_personalization", { interests: ["space"] }),
        source("creation_direction", { startDirection: "world_first" }),
        failingOptional,
      ],
    });

    expect(assembled.sections.map((entry) => entry.section)).toEqual([
      "child_identity",
      "child_personalization",
      "creation_direction",
    ]);
    expect(assembled.droppedSections).toContain("creation_selections");
  });
});
