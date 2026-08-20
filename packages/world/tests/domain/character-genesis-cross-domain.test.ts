import { describe, expect, it } from "vitest";

import {
  buildCommittedGenesisStoryContextProjection,
  validateCharacterGenesisCrossDomain,
  type CharacterGenesisPackage,
  type GenesisEnvironmentState,
} from "../../src/domain";

function environment(): GenesisEnvironmentState {
  return {
    binding: { worldId: "world-1", regionId: "region-1", homeId: "home-1" },
    regionProfile: {
      habitatType: "temperate forest",
      terrain: ["woodland"],
      vegetation: ["oak"],
      waterFeatures: ["stream"],
      environmentalFeatures: ["stone bridge"],
      climate: {
        climateType: "cool temperate",
        temperatureBand: "cool",
        precipitationBand: "moderate",
        seasonalVariation: "high",
      },
      loreConstraints: [],
    },
    calendar: {
      calendarId: "calendar-1",
      displayName: "Forest Calendar",
      seasons: [
        {
          id: "leafwhisper",
          displayName: "Leafwhisper",
          order: 1,
          semantics: {
            temperatureTrend: "stable",
            precipitationTrend: "stable",
            daylightTrend: "stable",
            vegetationPhase: "active",
          },
        },
      ],
    },
    temporal: {
      calendarId: "calendar-1",
      seasonId: "leafwhisper",
      source: "world_lore",
    },
    local: { localConditions: [], exceptions: [] },
    decisionTrace: [],
  };
}

function completePackage(status: CharacterGenesisPackage["status"] = "selected"):
  CharacterGenesisPackage {
  return {
    id: "genesis-1",
    householdId: "household-1",
    childProfileId: "child-1",
    characterId: "character-1",
    universeSeed: "universe-seed",
    candidateSeed: "candidate-seed",
    version: status === "committed" ? 3 : 2,
    status,
    provenance: {
      schemaRevision: "character-genesis.v1",
      seed: "candidate-seed",
      generatedAt: "2026-08-20T00:00:00.000Z",
    },
    sections: {
      origin: {
        summary: "Miro lives beside the old forest bridge.",
        narrative:
          "FULL PRIVATE ORIGIN NARRATIVE that must never be copied wholesale into first-story context.",
        facts: [
          {
            id: "fact-visible",
            kind: "home",
            summary: "Miro knows the old forest bridge as home.",
            visibility: "known_to_character",
          },
          {
            id: "fact-hidden",
            kind: "mystery",
            summary: "The bridge was built by a forgotten order.",
            visibility: "unknown_to_character",
          },
        ],
        summaryFactIds: ["fact-visible"],
        unresolvedQuestions: [
          {
            id: "question-1",
            summary: "Why does the river glow at night?",
            visibility: "known_to_character",
            relatedFactIds: ["fact-visible"],
          },
        ],
        storyHooks: [
          {
            id: "hook-1",
            summary: "A new footprint appears beside the bridge.",
            relatedFactIds: ["fact-visible"],
            potential: 0.8,
          },
        ],
      },
      traits: {
        dna: {
          curiosity: 0.7,
          courage: 0.6,
          empathy: 0.8,
          sociability: 0.6,
          patience: 0.5,
          imagination: 0.8,
          persistence: 0.6,
          independence: 0.5,
          playfulness: 0.7,
          caution: 0.4,
          adaptability: 0.7,
        },
        dynamic: {
          happiness: 0.6,
          anxiety: 0.2,
          confidence: 0.6,
          energy: 0.7,
          loneliness: 0.1,
          excitement: 0.6,
        },
        contextual: [],
        learnedModifiers: [],
        evidence: [],
        seed: "candidate-seed",
        derivationRevision: "character-dna-v1",
      },
      social: {
        npcs: [
          {
            candidateId: "npc-lina",
            role: "friend",
            displayName: "Lina",
            originFactIds: ["fact-visible"],
          },
        ],
        relationships: [
          {
            fromCandidateId: "character-1",
            toCandidateId: "npc-lina",
            trust: 0.8,
            affection: 0.9,
            familiarity: 0.8,
            respect: 0.7,
            tension: 0.1,
            dependence: 0.2,
          },
        ],
      },
      inventory: {
        items: [
          {
            candidateId: "item-compass",
            displayName: "Old Compass",
            category: "keepsake",
            origin: "Found near the bridge",
            emotionalValue: 0.7,
            storyPotential: 0.8,
            originFactIds: ["fact-visible"],
          },
        ],
      },
      memoryAndThreads: {
        memories: [
          {
            candidateId: "memory-visible",
            summary: "Lina and Miro repaired the bridge rail together.",
            visibility: "known_to_character",
            originFactIds: ["fact-visible"],
          },
          {
            candidateId: "memory-hidden",
            summary: "The forgotten order marked the bridge centuries ago.",
            visibility: "system_only",
            originFactIds: ["fact-hidden"],
          },
        ],
        threads: [
          {
            candidateId: "thread-footprint",
            summary: "Discover who left the footprint by the bridge.",
            status: "unresolved",
            visibility: "known_to_character",
            potential: 0.9,
            originFactIds: ["fact-visible"],
          },
        ],
      },
      environment: environment(),
    },
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
    ...(status === "selected"
      ? { selectedAt: "2026-08-20T00:01:00.000Z" }
      : {}),
    ...(status === "committed"
      ? {
          selectedAt: "2026-08-20T00:01:00.000Z",
          committedAt: "2026-08-20T00:02:00.000Z",
        }
      : {}),
  };
}

describe("Character Genesis cross-domain validation", () => {
  it("accepts a complete coherent selected package for commit", () => {
    const result = validateCharacterGenesisCrossDomain(completePackage(), {
      requireCompletePackage: true,
      requireSelectedForCommit: true,
      expectedWorldId: "world-1",
      expectedRegionId: "region-1",
      expectedHomeId: "home-1",
    });

    expect(result.valid).toBe(true);
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual(
      [],
    );
  });

  it("detects normalized duplicate NPC, item and thread identities", () => {
    const candidate = completePackage();
    candidate.sections.social!.npcs.push({
      candidateId: "npc-lina-2",
      role: "neighbor",
      displayName: "  LINA  ",
      originFactIds: ["fact-visible"],
    });
    candidate.sections.inventory!.items.push({
      candidateId: "item-compass-2",
      displayName: "old   compass",
      category: "tool",
      origin: "Duplicate candidate",
      originFactIds: ["fact-visible"],
    });
    candidate.sections.memoryAndThreads!.threads.push({
      candidateId: "thread-footprint-2",
      summary: "Discover who left the footprint by the bridge!",
      status: "dormant",
      visibility: "known_to_character",
      potential: 0.4,
      originFactIds: ["fact-visible"],
    });

    const codes = validateCharacterGenesisCrossDomain(candidate).issues.map(
      (issue) => issue.code,
    );
    expect(codes).toContain("GENESIS_DUPLICATE_NPC_IDENTITY");
    expect(codes).toContain("GENESIS_DUPLICATE_ITEM_IDENTITY");
    expect(codes).toContain("GENESIS_DUPLICATE_THREAD_IDENTITY");
  });

  it("blocks character-visible knowledge that depends on hidden origin facts", () => {
    const candidate = completePackage();
    candidate.sections.memoryAndThreads!.memories[0]!.originFactIds = [
      "fact-hidden",
    ];

    const result = validateCharacterGenesisCrossDomain(candidate);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "GENESIS_CHARACTER_VISIBLE_HIDDEN_FACT_LEAK",
    );
  });

  it("surfaces canonical world binding contradictions", () => {
    const result = validateCharacterGenesisCrossDomain(completePackage(), {
      expectedWorldId: "world-other",
      expectedRegionId: "region-1",
      expectedHomeId: "home-1",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code.includes("WORLD"))).toBe(true);
  });
});

describe("committed Genesis first-story projection", () => {
  it("rejects a selected but uncommitted package", () => {
    expect(() => buildCommittedGenesisStoryContextProjection(completePackage())).toThrow(
      "GENESIS_FIRST_STORY_REQUIRES_COMMITTED_PACKAGE",
    );
  });

  it("projects only relevant character-visible fragments and never the full origin narrative", () => {
    const projection = buildCommittedGenesisStoryContextProjection(
      completePackage("committed"),
    );
    const serialized = JSON.stringify(projection);

    expect(projection.relevantMemories.memories).toEqual([
      { summary: "Lina and Miro repaired the bridge rail together." },
    ]);
    expect(projection.relevantMemories.threads).toHaveLength(1);
    expect(projection.relevantMemories.storyHooks).toHaveLength(1);
    expect(serialized).not.toContain("FULL PRIVATE ORIGIN NARRATIVE");
    expect(serialized).not.toContain("forgotten order marked");
    expect(serialized).not.toContain("child-1");
    expect(serialized).not.toContain("household-1");
  });
});
