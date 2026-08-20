import { describe, expect, it } from "vitest";

import {
  CharacterGenesisCoordinator,
  CharacterGenesisValidationError,
  type CharacterGenesisCanonicalCommitPort,
  type CharacterGenesisCanonicalCommitRequest,
  type CharacterGenesisRepositoryPort,
} from "../../src/application/character-genesis.service";
import type { CharacterGenesisPackage } from "../../src/domain";

type Stored = Map<string, CharacterGenesisPackage>;
type CandidateList = CharacterGenesisPackage[];

class InMemoryGenesisRepository implements CharacterGenesisRepositoryPort {
  private readonly stored: Stored = new Map();
  failNextMarkCommitted = false;

  async save(candidate: CharacterGenesisPackage): Promise<void> {
    this.stored.set(candidate.id, structuredClone(candidate));
  }

  async getById(candidateId: string): Promise<CharacterGenesisPackage | null> {
    return structuredClone(this.stored.get(candidateId) ?? null);
  }

  async listByCharacter(characterId: string): Promise<CandidateList> {
    return [...this.stored.values()]
      .filter((candidate) => candidate.characterId === characterId)
      .map((candidate) => structuredClone(candidate));
  }

  async selectExclusive(
    characterId: string,
    selected: CharacterGenesisPackage,
  ): Promise<void> {
    for (const [id, candidate] of this.stored) {
      if (
        candidate.characterId === characterId &&
        candidate.status === "selected" &&
        id !== selected.id
      ) {
        const staged = structuredClone(candidate);
        delete staged.selectedAt;
        staged.status = "staged";
        staged.version = candidate.version + 1;
        this.stored.set(id, staged);
      }
    }
    this.stored.set(selected.id, structuredClone(selected));
  }

  async markCommitted(candidate: CharacterGenesisPackage): Promise<void> {
    if (this.failNextMarkCommitted) {
      this.failNextMarkCommitted = false;
      throw new Error("GENESIS_MARK_COMMITTED_FAILED");
    }
    this.stored.set(candidate.id, structuredClone(candidate));
  }
}

class RecordingCommitter implements CharacterGenesisCanonicalCommitPort {
  readonly committed: CharacterGenesisPackage[] = [];
  readonly keys: string[] = [];
  private readonly results = new Map<
    string,
    { worldId: string; homeId: string }
  >();

  async commit(request: CharacterGenesisCanonicalCommitRequest) {
    this.keys.push(request.idempotencyKey);
    const existing = this.results.get(request.idempotencyKey);
    if (existing) return existing;

    this.committed.push(structuredClone(request.candidate));
    const result = { worldId: "world-1", homeId: "home-1" };
    this.results.set(request.idempotencyKey, result);
    return result;
  }
}

function completeSections() {
  return {
    origin: {
      summary: "Miro lives in Ağaçköprü with a life before the first story.",
      narrative: "A coherent origin narrative.",
      facts: [
        {
          id: "fact-lina",
          kind: "relationship",
          summary: "Lina is Miro's close friend.",
          visibility: "known_to_character" as const,
        },
      ],
      summaryFactIds: ["fact-lina"],
      unresolvedQuestions: [
        {
          id: "question-river",
          summary: "Why does the river glow?",
          visibility: "known_to_character" as const,
          relatedFactIds: ["fact-lina"],
        },
      ],
      storyHooks: [
        {
          id: "hook-bridge",
          summary: "A footprint appears near the bridge.",
          relatedFactIds: ["fact-lina"],
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
      seed: "trait-seed",
      derivationRevision: "character-dna-v1",
    },
    social: {
      npcs: [
        {
          candidateId: "npc-lina",
          role: "friend",
          displayName: "Lina",
          originFactIds: ["fact-lina"],
        },
      ],
      relationships: [
        {
          fromCandidateId: "character-1",
          toCandidateId: "npc-lina",
          trust: 0.8,
          affection: 0.9,
          familiarity: 0.9,
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
          origin: "Found near home",
          storyPotential: 0.7,
          originFactIds: ["fact-lina"],
        },
      ],
    },
    memoryAndThreads: {
      memories: [
        {
          candidateId: "memory-bridge",
          summary: "Miro remembers repairing the bridge with Lina.",
          visibility: "known_to_character" as const,
          originFactIds: ["fact-lina"],
        },
      ],
      threads: [
        {
          candidateId: "thread-footprint",
          summary: "Find who left the footprint near the bridge.",
          status: "unresolved" as const,
          visibility: "known_to_character" as const,
          potential: 0.8,
          originFactIds: ["fact-lina"],
        },
      ],
    },
    environment: {
      binding: { worldId: "world-1", regionId: "region-1", homeId: "home-1" },
      regionProfile: {
        habitatType: "temperate forest",
        terrain: ["woodland"],
        vegetation: ["oak"],
        waterFeatures: ["stream"],
        environmentalFeatures: ["bridge"],
        climate: {
          climateType: "cool temperate",
          temperatureBand: "cool",
          precipitationBand: "moderate",
          seasonalVariation: "high" as const,
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
              temperatureTrend: "stable" as const,
              precipitationTrend: "stable" as const,
              daylightTrend: "stable" as const,
            },
          },
        ],
      },
      temporal: {
        calendarId: "calendar-1",
        seasonId: "leafwhisper",
        source: "world_lore" as const,
      },
      local: { localConditions: [], exceptions: [] },
      decisionTrace: [],
    },
  };
}

function baseInput(candidateSeed: string) {
  return {
    householdId: "household-1",
    childProfileId: "child-1",
    characterId: "character-1",
    universeSeed: "universe-seed",
    candidateSeed,
    provenance: {
      schemaRevision: "character-genesis.v1",
      seed: candidateSeed,
      generatedAt: "2026-08-19T12:00:00.000Z",
    },
    sections: completeSections(),
  };
}

describe("CharacterGenesisCoordinator", () => {
  it("stages candidates without calling canonical commit", async () => {
    const repository = new InMemoryGenesisRepository();
    const committer = new RecordingCommitter();
    const coordinator = new CharacterGenesisCoordinator(repository, committer);

    const staged = await coordinator.stage(baseInput("candidate-a"));

    expect(staged.status).toBe("staged");
    expect(committer.committed).toHaveLength(0);
    expect(await repository.getById(staged.id)).toEqual(staged);
  });

  it("keeps exactly one selected candidate per character", async () => {
    const repository = new InMemoryGenesisRepository();
    const committer = new RecordingCommitter();
    const coordinator = new CharacterGenesisCoordinator(repository, committer);

    const first = await coordinator.stage(baseInput("candidate-a"));
    const second = await coordinator.stage(baseInput("candidate-b"));

    await coordinator.select(first.id);
    const selectedSecond = await coordinator.select(second.id);

    const candidates = await repository.listByCharacter("character-1");
    const selected = candidates.filter(
      (candidate) => candidate.status === "selected",
    );
    const firstCandidate = candidates.find(
      (candidate) => candidate.id === first.id,
    );

    expect(selected).toEqual([selectedSecond]);
    expect(firstCandidate?.status).toBe("staged");
  });

  it("commits only a selected cross-domain valid complete candidate", async () => {
    const repository = new InMemoryGenesisRepository();
    const committer = new RecordingCommitter();
    const coordinator = new CharacterGenesisCoordinator(repository, committer);

    const staged = await coordinator.stage(baseInput("candidate-a"));
    await expect(coordinator.commit(staged.id)).rejects.toThrow(
      "Only the selected genesis package can be committed",
    );

    const selected = await coordinator.select(staged.id);
    const result = await coordinator.commit(selected.id);

    expect(result.validation.valid).toBe(true);
    expect(result.candidate.status).toBe("committed");
    expect(result.canonical).toEqual({ worldId: "world-1", homeId: "home-1" });
    expect(committer.committed).toHaveLength(1);
    expect(committer.committed[0]?.status).toBe("selected");
    expect(committer.keys).toEqual([`character-genesis:${selected.id}`]);
  });

  it("blocks invalid references before canonical mutation", async () => {
    const repository = new InMemoryGenesisRepository();
    const committer = new RecordingCommitter();
    const coordinator = new CharacterGenesisCoordinator(repository, committer);

    const input = baseInput("candidate-a");
    input.sections.social.relationships[0]!.toCandidateId = "npc-missing";

    const staged = await coordinator.stage(input);
    const selected = await coordinator.select(staged.id);

    await expect(coordinator.commit(selected.id)).rejects.toBeInstanceOf(
      CharacterGenesisValidationError,
    );
    expect(committer.committed).toHaveLength(0);
  });

  it("blocks incomplete packages before canonical mutation", async () => {
    const repository = new InMemoryGenesisRepository();
    const committer = new RecordingCommitter();
    const coordinator = new CharacterGenesisCoordinator(repository, committer);
    const input = baseInput("candidate-a");
    delete (input.sections as Partial<typeof input.sections>).environment;

    const staged = await coordinator.stage(input);
    const selected = await coordinator.select(staged.id);

    await expect(coordinator.commit(selected.id)).rejects.toBeInstanceOf(
      CharacterGenesisValidationError,
    );
    expect(committer.committed).toHaveLength(0);
  });

  it("reuses a stable canonical idempotency key when finalization is retried", async () => {
    const repository = new InMemoryGenesisRepository();
    const committer = new RecordingCommitter();
    const coordinator = new CharacterGenesisCoordinator(repository, committer);

    const staged = await coordinator.stage(baseInput("candidate-a"));
    const selected = await coordinator.select(staged.id);
    repository.failNextMarkCommitted = true;

    await expect(coordinator.commit(selected.id)).rejects.toThrow(
      "GENESIS_MARK_COMMITTED_FAILED",
    );
    expect(committer.committed).toHaveLength(1);
    expect((await repository.getById(selected.id))?.status).toBe("selected");

    const retried = await coordinator.commit(selected.id);

    expect(retried.candidate.status).toBe("committed");
    expect(committer.committed).toHaveLength(1);
    expect(committer.keys).toHaveLength(2);
    expect(new Set(committer.keys)).toEqual(
      new Set([`character-genesis:${selected.id}`]),
    );
  });
});
