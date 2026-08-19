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
    sections: {
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
    },
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

  it("commits only a selected structurally valid candidate", async () => {
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
