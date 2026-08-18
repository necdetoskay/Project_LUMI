import { describe, expect, it } from "vitest";

import {
  assembleGenerationContext,
  toPromptGenerationContext,
} from "./generation-context-assembler";
import {
  createGenerationContextCompactorRegistry,
  getDefaultGenerationContextCompactors,
  type GenerationContextCompactor,
} from "./generation-context-compaction";
import type { GenerationContext } from "./generation-context.service";
import type { GenerationContextSource } from "./generation-context-source";

function context(profile: GenerationContext["profile"]): GenerationContext {
  return {
    profile,
    child: {
      id: "child-internal",
      ageBand: "6-8",
      ageYears: 7,
      locale: "tr-TR",
      interests: ["space"],
      customInterests: [],
      developmentGoals: ["curiosity"],
    },
    creation: {
      cycleId: "cycle-internal",
      startDirection: "world_first",
      previousSelections: {},
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
    sourceVersion: "v1",
    authority: "derived",
    reason: "current_task",
    resolve: () => ({ value }),
  };
}

function storyRequiredSources(): GenerationContextSource[] {
  return [
    source("child_identity", {
      ageBand: "6-8",
      ageYears: 7,
      locale: "tr-TR",
    }),
    source("child_personalization", { interests: ["space"] }),
    source("character_state", { name: "Lina", goal: "find the observatory" }),
  ];
}

describe("generation context compaction", () => {
  it("deduplicates and prunes oversized relevant memories before dropping the section", () => {
    const repeated = `shared-${"x".repeat(320)}`;
    const memories = [
      repeated,
      repeated,
      ...Array.from(
        { length: 24 },
        (_, index) => `memory-${index}-${"m".repeat(320)}`,
      ),
    ];

    const assembled = assembleGenerationContext(context("story_generation"), {
      sources: [
        ...storyRequiredSources(),
        source("relevant_memories", memories),
      ],
    });

    const section = assembled.sections.find(
      (entry) => entry.section === "relevant_memories",
    );
    expect(section).toBeDefined();
    expect(section!.estimatedTokens).toBeLessThanOrEqual(section!.maxTokens);
    expect(section!.provenance.compaction).toMatchObject({
      strategy: "dedupe-and-tail-prune-v1",
    });
    expect(section!.provenance.compaction!.removedItems).toBeGreaterThan(1);
    expect(section!.value).toEqual(expect.any(Array));
    expect((section!.value as unknown[]).length).toBeGreaterThan(0);
    expect((section!.value as unknown[]).length).toBeLessThan(memories.length);
    expect(assembled.droppedSections).not.toContain("relevant_memories");
  });

  it("compacts an oversized required world-state list instead of failing", () => {
    const worldState = {
      season: "late-summer",
      events: Array.from(
        { length: 30 },
        (_, index) => `world-event-${index}-${"w".repeat(280)}`,
      ),
    };

    const assembled = assembleGenerationContext(context("world_generation"), {
      sources: [
        source("child_identity", { ageBand: "6-8", locale: "tr-TR" }),
        source("child_personalization", { interests: ["space"] }),
        source("world_state", worldState),
      ],
    });

    const section = assembled.sections.find(
      (entry) => entry.section === "world_state",
    );
    expect(section).toBeDefined();
    expect(section!.priority).toBe("required");
    expect(section!.estimatedTokens).toBeLessThanOrEqual(1000);
    expect(section!.provenance.compaction).toBeDefined();
    expect((section!.value as { season: string }).season).toBe("late-summer");
    expect(
      (section!.value as { events: unknown[] }).events.length,
    ).toBeLessThan(worldState.events.length);
  });

  it("produces identical compaction and fingerprint for identical input", () => {
    const memories = Array.from(
      { length: 20 },
      (_, index) => `memory-${index}-${"d".repeat(360)}`,
    );
    const sources = [
      ...storyRequiredSources(),
      source("relevant_memories", memories),
    ];

    const first = assembleGenerationContext(context("story_generation"), {
      sources,
    });
    const second = assembleGenerationContext(context("story_generation"), {
      sources,
    });

    expect(second).toEqual(first);
    expect(second.fingerprint).toBe(first.fingerprint);
  });

  it("keeps compaction evidence out of the provider-visible payload", () => {
    const memories = Array.from(
      { length: 20 },
      (_, index) => `memory-${index}-${"p".repeat(360)}`,
    );
    const assembled = assembleGenerationContext(context("story_generation"), {
      sources: [
        ...storyRequiredSources(),
        source("relevant_memories", memories),
      ],
    });

    const promptContext = toPromptGenerationContext(assembled);
    const serialized = JSON.stringify(promptContext);

    expect(promptContext).toHaveProperty("relevant_memories");
    expect(serialized).not.toContain("dedupe-and-tail-prune-v1");
    expect(serialized).not.toContain("removedItems");
    expect(serialized).not.toContain("compaction");
  });

  it("falls back safely when a required oversized value cannot be compacted", () => {
    expect(() =>
      assembleGenerationContext(context("world_generation"), {
        sources: [
          source("child_identity", { ageBand: "6-8", locale: "tr-TR" }),
          source("child_personalization", { interests: ["space"] }),
          source("world_state", { canon: "z".repeat(8_000) }),
        ],
      }),
    ).toThrow(
      /GENERATION_CONTEXT_REQUIRED_SECTION_BUDGET_EXCEEDED:world_state/,
    );
  });

  it("rejects duplicate compactor ownership", () => {
    const worldCompactor = getDefaultGenerationContextCompactors().find(
      (entry) => entry.section === "world_state",
    );
    expect(worldCompactor).toBeDefined();

    expect(() =>
      createGenerationContextCompactorRegistry([
        worldCompactor!,
        { ...worldCompactor! } as GenerationContextCompactor,
      ]),
    ).toThrow("GENERATION_CONTEXT_COMPACTOR_DUPLICATE:world_state");
  });
});
