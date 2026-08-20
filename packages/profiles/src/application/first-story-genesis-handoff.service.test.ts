import { describe, expect, it } from "vitest";

import {
  assembleFirstStoryGenesisHandoff,
  createFirstStoryGenerationContext,
  type FirstStoryGenesisHandoffProjection,
} from "./first-story-genesis-handoff.service";
import type { GenerationContext } from "./generation-context.service";

function baseContext(): GenerationContext {
  return {
    profile: "story_generation",
    child: {
      id: "child-internal-id",
      ageBand: "6-8",
      ageYears: 7,
      locale: "tr-TR",
      interests: ["space"],
      customInterests: [],
      developmentGoals: ["curiosity"],
    },
    creation: {
      cycleId: "cycle-internal-id",
      startDirection: "character_first",
      previousSelections: {},
    },
  };
}

function projection(): FirstStoryGenesisHandoffProjection {
  return {
    commit: {
      genesisPackageId: "genesis-internal-id",
      version: 3,
      status: "committed",
    },
    characterState: {
      origin: {
        summary: "Miro lives by the old bridge.",
        facts: [{ summary: "Lina is Miro's friend." }],
      },
      dna: { curiosity: 0.8 },
      social: { npcs: [{ role: "friend", displayName: "Lina" }] },
      inventory: [{ displayName: "Old Compass", category: "keepsake" }],
    },
    worldState: {
      stable: { habitat: "temperate forest", climate: "cool temperate" },
      temporal: { seasonName: "Leafwhisper" },
    },
    relevantMemories: {
      memories: [{ summary: "Repaired the bridge rail with Lina." }],
      threads: [{ summary: "Who left the footprint?", potential: 0.9 }],
    },
  };
}

describe("first-story Genesis Context Assembly handoff", () => {
  it("injects committed canonical projections without creating another context engine", () => {
    const context = createFirstStoryGenerationContext(baseContext(), projection());
    expect(context.canonical?.characterState).toEqual(projection().characterState);
    expect(context.canonical?.worldState).toEqual(projection().worldState);
    expect(context.canonical?.relevantMemories).toEqual(
      projection().relevantMemories,
    );
    expect(context.canonical?.sourceRevision).toBe("genesis:3");
  });

  it("assembles character/world/relevant-memory sections through the existing story policy", () => {
    const result = assembleFirstStoryGenesisHandoff(baseContext(), projection());
    const sections = new Map(
      result.assembled.sections.map((section) => [section.section, section]),
    );

    expect(sections.get("character_state")?.provenance.source).toBe(
      "genesis.committed-character-state",
    );
    expect(sections.get("world_state")?.provenance.source).toBe(
      "genesis.committed-world-state",
    );
    expect(sections.get("relevant_memories")?.provenance.source).toBe(
      "genesis.relevant-memory-thread-fragments",
    );
    expect(result.promptContext.character_state).toEqual(
      projection().characterState,
    );
    expect(result.promptContext.world_state).toEqual(projection().worldState);
    expect(result.promptContext.relevant_memories).toEqual(
      projection().relevantMemories,
    );
    expect(result.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not expose internal child/cycle/genesis ids to provider-visible prompt context", () => {
    const result = assembleFirstStoryGenesisHandoff(baseContext(), projection());
    const serialized = JSON.stringify(result.promptContext);
    expect(serialized).not.toContain("child-internal-id");
    expect(serialized).not.toContain("cycle-internal-id");
    expect(serialized).not.toContain("genesis-internal-id");
  });
});
