import { describe, expect, it } from "vitest";

import {
  CharacterGenesisCoordinator,
  CharacterGenesisValidationError,
  type CharacterGenesisCanonicalCommitPort,
  type CharacterGenesisRepositoryPort,
} from "../../src/application/character-genesis.service";
import type { CharacterGenesisPackage } from "../../src/domain";

type Stored = Map<string, CharacterGenesisPackage>;
type CandidateList = CharacterGenesisPackage[];

class InMemoryGenesisRepository implements CharacterGenesisRepositoryPort {
  private readonly stored: Stored = new Map();

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
        this.stored.set(id, {
          ...candidate,
          status: "staged",
          selectedAt: undefined,
          version: candidate.version + 1,
        });
      }
    }
    this.stored.set(selected.id, structuredClone(selected));
  }

  async markCommitted(candidate: CharacterGenesisPackage): Promise<void> {
    this.stored.set(candidate.id, structuredClone(candidate));
  }
}

class RecordingCommitter implements CharacterGenesisCanonicalCommitPort {
  readonly committed: CharacterGenesisPackage[] = [];

  async commit(candidate: CharacterGenesisPackage) {
    this.committed.push(structuredClone(candidate));
    return { worldId: "world-1", homeId: "home-1" };
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
});
