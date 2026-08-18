import { describe, expect, it } from "vitest";

import {
  assembleGenerationContext,
  toPromptGenerationContext,
} from "./generation-context-assembler";
import type { GenerationContext } from "./generation-context.service";
import type { GenerationContextSource } from "./generation-context-source";

function onboardingContext(): GenerationContext {
  return {
    profile: "character_onboarding",
    child: {
      id: "child-internal-42",
      ageBand: "6-8",
      ageYears: 7,
      locale: "tr-TR",
      interests: ["space"],
      customInterests: ["crystals"],
      developmentGoals: ["curiosity"],
    },
    creation: {
      cycleId: "cycle-internal-84",
      startDirection: "world_first",
      previousSelections: { worldFeeling: "crystal_caves" },
    },
  };
}

function injectedSources(version = "v7"): GenerationContextSource[] {
  const source = (
    section: GenerationContextSource["section"],
    value: unknown,
    sourceId: string,
  ): GenerationContextSource => ({
    section,
    source: `test.${section}`,
    sourceVersion: version,
    authority: "derived",
    reason: "current_task",
    resolve: () => ({
      value,
      sourceId,
      revision: "rev-3",
      updatedAt: "2026-08-18T00:00:00.000Z",
    }),
  });

  return [
    source(
      "child_identity",
      { ageBand: "6-8", ageYears: 7, locale: "tr-TR" },
      "child-source-id",
    ),
    source(
      "child_personalization",
      { interests: ["space"] },
      "personalization-source-id",
    ),
    source(
      "creation_direction",
      { startDirection: "world_first" },
      "cycle-source-id",
    ),
    source(
      "creation_selections",
      { worldFeeling: "crystal_caves" },
      "cycle-source-id",
    ),
  ];
}

describe("generation context provenance and fingerprint", () => {
  it("attaches canonical provenance without exposing it to the provider payload", () => {
    const assembled = assembleGenerationContext(onboardingContext());
    const childIdentity = assembled.sections.find(
      (section) => section.section === "child_identity",
    );

    expect(childIdentity?.provenance).toEqual({
      source: "profiles.child-profile",
      sourceId: "child-internal-42",
      sourceVersion: "v1",
      revision: undefined,
      authority: "canonical",
      reason: "required",
      updatedAt: undefined,
    });

    const prompt = toPromptGenerationContext(assembled);
    const serialized = JSON.stringify(prompt);
    expect(serialized).not.toContain("provenance");
    expect(serialized).not.toContain("child-internal-42");
    expect(serialized).not.toContain("cycle-internal-84");
    expect(serialized).not.toContain("profiles.child-profile");
  });

  it("produces the same fingerprint for the same model-visible values and provenance", () => {
    const first = assembleGenerationContext(onboardingContext(), {
      sources: injectedSources(),
    });
    const second = assembleGenerationContext(onboardingContext(), {
      sources: injectedSources(),
    });

    expect(first.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(second.fingerprint).toBe(first.fingerprint);
  });

  it("changes the fingerprint when source version changes even if values are identical", () => {
    const first = assembleGenerationContext(onboardingContext(), {
      sources: injectedSources("v7"),
    });
    const second = assembleGenerationContext(onboardingContext(), {
      sources: injectedSources("v8"),
    });

    expect(second.fingerprint).not.toBe(first.fingerprint);
    expect(toPromptGenerationContext(second)).toEqual(
      toPromptGenerationContext(first),
    );
  });

  it("changes the fingerprint when canonical source identity changes without leaking that id", () => {
    const firstSources = injectedSources();
    const secondSources = injectedSources().map((source) =>
      source.section === "child_identity"
        ? {
            ...source,
            resolve: () => ({
              value: {
                ageBand: "6-8",
                ageYears: 7,
                locale: "tr-TR",
              },
              sourceId: "different-internal-child-id",
              revision: "rev-3",
              updatedAt: "2026-08-18T00:00:00.000Z",
            }),
          }
        : source,
    );

    const first = assembleGenerationContext(onboardingContext(), {
      sources: firstSources,
    });
    const second = assembleGenerationContext(onboardingContext(), {
      sources: secondSources,
    });

    expect(second.fingerprint).not.toBe(first.fingerprint);
    expect(JSON.stringify(toPromptGenerationContext(second))).not.toContain(
      "different-internal-child-id",
    );
  });

  it("changes the fingerprint when provider-visible context changes", () => {
    const first = assembleGenerationContext(onboardingContext(), {
      sources: injectedSources(),
    });
    const changed = injectedSources().map((source) =>
      source.section === "creation_selections"
        ? {
            ...source,
            resolve: () => ({
              value: { worldFeeling: "floating_islands" },
              sourceId: "cycle-source-id",
              revision: "rev-3",
              updatedAt: "2026-08-18T00:00:00.000Z",
            }),
          }
        : source,
    );
    const second = assembleGenerationContext(onboardingContext(), {
      sources: changed,
    });

    expect(second.fingerprint).not.toBe(first.fingerprint);
  });
});
