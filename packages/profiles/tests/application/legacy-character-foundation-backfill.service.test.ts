import { describe, expect, it } from "vitest";

import type {
  CharacterFoundationRecord,
  CharacterFoundationRepository,
  FoundationScope,
  SaveCharacterFoundationInput,
} from "../../src";
import {
  LegacyCharacterFoundationBackfillService,
  type LegacyFoundationEvidence,
} from "../../src/application/legacy-character-foundation-backfill.service";

class InMemoryFoundationRepository implements CharacterFoundationRepository {
  foundation: CharacterFoundationRecord | null = null;
  saves = 0;

  async findByScope(
    scope: FoundationScope,
  ): Promise<CharacterFoundationRecord | null> {
    if (!this.foundation) return null;
    return this.foundation.householdId === scope.householdId &&
      this.foundation.childProfileId === scope.childProfileId &&
      this.foundation.characterId === scope.characterId &&
      this.foundation.worldId === scope.worldId
      ? this.foundation
      : null;
  }

  async save(
    input: SaveCharacterFoundationInput,
  ): Promise<CharacterFoundationRecord> {
    this.saves += 1;
    this.foundation = input.foundation;
    return input.foundation;
  }
}

const baseEvidence: LegacyFoundationEvidence = {
  householdId: "household-1",
  childProfileId: "child-1",
  characterId: "character-1",
  worldId: "world-1",
  priorStoryCount: 0,
};

const now = new Date("2026-08-17T10:00:00.000Z");

function createService(repository = new InMemoryFoundationRepository()) {
  return {
    repository,
    service: new LegacyCharacterFoundationBackfillService({
      repository,
      now: () => now,
    }),
  };
}

describe("LegacyCharacterFoundationBackfillService", () => {
  it("reports a zero-story legacy profile in dry-run mode without writing", async () => {
    const { repository, service } = createService();

    const report = await service.backfill(baseEvidence, { dryRun: true });

    expect(report.status).toBe("would-create");
    expect(report.dryRun).toBe(true);
    expect(report.confidence).toBe("low");
    expect(repository.saves).toBe(0);
    expect(report.foundation?.genesis.provenance.origin).toBe("legacy-derived");
    expect(report.foundation?.sagaCanon.forbiddenEarlyReveals).toEqual([]);
    expect(report.foundation?.sagaProgression.knownFacts).toEqual([]);
  });

  it("preserves few-story canon and reuses established entities without duplication", async () => {
    const { repository, service } = createService();
    const evidence: LegacyFoundationEvidence = {
      ...baseEvidence,
      priorStoryCount: 2,
      premise: "Mira arrived at the Glass Harbor with her aunt.",
      currentSituation: "Mira is repairing the old signal tower.",
      longTermDesire: "Reconnect the harbor beacon.",
      fundamentalNeed: "Learn whom to trust.",
      knownFacts: ["Aunt Sera runs the ferry.", "Aunt Sera runs the ferry."],
      currentBeliefs: ["The beacon can still be repaired."],
      unresolvedQuestions: ["Who damaged the beacon?"],
      establishedSocialEcology: [
        {
          id: "role-sera",
          roleType: "caregiver",
          label: "Aunt Sera",
          purpose: "Established caregiver",
          required: true,
          targetCharacterId: "npc-sera",
        },
        {
          id: "role-sera-duplicate",
          roleType: "caregiver",
          label: "Aunt Sera duplicate",
          purpose: "Duplicate legacy projection",
          required: true,
          targetCharacterId: "npc-sera",
        },
      ],
      establishedMaterializations: [
        {
          kind: "npc",
          authority: "profiles.characters",
          entityId: "npc-sera",
          reused: false,
        },
        {
          kind: "npc",
          authority: "profiles.characters",
          entityId: "npc-sera",
          reused: false,
        },
      ],
    };

    const first = await service.backfill(evidence);
    const second = await service.backfill(evidence);

    expect(first.status).toBe("created");
    expect(second.status).toBe("already-migrated");
    expect(repository.saves).toBe(1);
    expect(first.foundation?.genesis.premise).toBe(evidence.premise);
    expect(first.foundation?.genesis.knownFacts).toEqual([
      "Aunt Sera runs the ferry.",
    ]);
    expect(first.foundation?.genesis.socialEcology).toHaveLength(1);
    expect(first.foundation?.bootstrapManifest?.materialized).toEqual([
      {
        kind: "npc",
        authority: "profiles.characters",
        entityId: "npc-sera",
        reused: true,
      },
    ]);
  });

  it("uses explicit established saga truth for many-story profiles but never invents reveal layers", async () => {
    const { service } = createService();
    const report = await service.backfill({
      ...baseEvidence,
      priorStoryCount: 12,
      premise: "Mira has protected the harbor across many adventures.",
      currentSituation: "The winter tide is approaching.",
      longTermDesire: "Keep the harbor safe.",
      fundamentalNeed: "Accept help from her community.",
      knownFacts: [
        "The lighthouse lens is cracked.",
        "Sera knows the old routes.",
      ],
      currentBeliefs: ["The winter tide will arrive early."],
      unresolvedQuestions: ["Why is the tide changing?"],
      establishedSagaTruth: "The moon engine controls the winter tide.",
      fundamentalFear: "The harbor will be abandoned.",
      stakes: "The community may lose its home.",
    });

    expect(report.status).toBe("created");
    expect(report.confidence).toBe("high");
    expect(report.foundation?.sagaCanon.deepTruth).toBe(
      "The moon engine controls the winter tide.",
    );
    expect(report.foundation?.sagaCanon.revealLayers).toEqual([]);
    expect(report.foundation?.sagaCanon.hiddenForces).toEqual([]);
  });

  it("routes ambiguous high-value profiles to manual review and respects opt-out", async () => {
    const { repository, service } = createService();

    const review = await service.backfill({
      ...baseEvidence,
      priorStoryCount: 20,
      ambiguous: true,
      highValueProfile: true,
    });
    const optedOut = await service.backfill({
      ...baseEvidence,
      characterId: "character-2",
      priorStoryCount: 3,
      optOut: true,
    });

    expect(review.status).toBe("manual-review");
    expect(optedOut.status).toBe("opted-out");
    expect(repository.saves).toBe(0);
  });
});
