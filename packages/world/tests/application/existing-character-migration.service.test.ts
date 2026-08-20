import { describe, expect, it, vi } from "vitest";

import {
  ExistingCharacterMigrationBlockedError,
  ExistingCharacterMigrationCoordinator,
  type ExistingCharacterMigrationRecord,
  type ExistingCharacterMigrationRepositoryPort,
  type ExistingCharacterMigrationSourcePort,
  type ExistingCharacterMigrationUpgradePort,
} from "../../src/application";
import type {
  ExistingCharacterBackfillProposal,
  ExistingCharacterMigrationSnapshot,
  GenesisEnvironmentState,
} from "../../src/domain";

const NOW = "2026-08-20T00:00:00.000Z";

function environment(): GenesisEnvironmentState {
  return {
    binding: { worldId: "world-1", regionId: "region-1", homeId: "home-1" },
    regionProfile: {
      habitatType: "harbor town",
      terrain: ["coast"],
      vegetation: ["salt grass"],
      waterFeatures: ["harbor"],
      environmentalFeatures: ["old lighthouse"],
      climate: {
        climateType: "mild maritime",
        temperatureBand: "mild",
        precipitationBand: "moderate",
        seasonalVariation: "moderate",
      },
      loreConstraints: [],
    },
    calendar: {
      calendarId: "calendar-1",
      displayName: "Harbor Calendar",
      seasons: [
        {
          id: "late-summer",
          displayName: "Late Summer",
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
      seasonId: "late-summer",
      source: "world_lore",
    },
    local: { localConditions: [], exceptions: [] },
    decisionTrace: [],
  };
}

function snapshot(): ExistingCharacterMigrationSnapshot {
  return {
    householdId: "household-1",
    childProfileId: "child-1",
    characterId: "character-1",
    universeSeed: "universe-seed",
    worldId: "world-1",
    existingSections: {
      origin: {
        summary: "Mira has long lived in Silver Harbor.",
        narrative:
          "Mira grew up around Silver Harbor and knows its old lighthouse.",
        facts: [
          {
            id: "fact-home",
            kind: "home",
            summary: "Mira lives in Silver Harbor.",
            visibility: "known_to_character",
            sourceRef: "story-12",
          },
        ],
        summaryFactIds: ["fact-home"],
        unresolvedQuestions: [
          {
            id: "question-lighthouse",
            summary: "Why does the lighthouse sometimes flash blue?",
            visibility: "known_to_character",
            relatedFactIds: ["fact-home"],
          },
        ],
        storyHooks: [
          {
            id: "hook-lighthouse",
            summary: "A blue flash appears after midnight.",
            relatedFactIds: ["fact-home"],
            potential: 0.8,
          },
        ],
      },
    },
    authoritativeFacts: [
      {
        path: "home.name",
        value: "Silver Harbor",
        authority: "story_history",
        sourceRef: "story-12",
      },
    ],
  };
}

function proposals(): ExistingCharacterBackfillProposal[] {
  const provenance = {
    kind: "directly_derived" as const,
    confidence: 0.95,
    evidenceRefs: ["story-12", "story-15"],
    generatedAt: NOW,
  };
  return [
    {
      id: "traits",
      section: "traits",
      summary: "Repeated story behavior supports stable traits.",
      provenance,
      assertions: [],
      value: {
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
        seed: "migration-seed",
        derivationRevision: "character-dna-v1",
      },
    },
    {
      id: "social",
      section: "social",
      summary: "Existing stories establish Lina as a friend.",
      provenance,
      reviewedByHuman: true,
      assertions: [],
      value: {
        npcs: [
          {
            candidateId: "npc-lina",
            role: "friend",
            displayName: "Lina",
            originFactIds: ["fact-home"],
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
    },
    {
      id: "inventory",
      section: "inventory",
      summary: "The compass already exists in canonical inventory.",
      provenance,
      reviewedByHuman: true,
      assertions: [],
      value: {
        items: [
          {
            candidateId: "item-compass",
            displayName: "Old Compass",
            category: "keepsake",
            origin: "Existing canonical inventory",
            emotionalValue: 0.7,
            storyPotential: 0.8,
            originFactIds: ["fact-home"],
          },
        ],
      },
    },
    {
      id: "memories",
      section: "memoryAndThreads",
      summary: "Existing story evidence becomes retrieval anchors.",
      provenance,
      assertions: [],
      value: {
        memories: [
          {
            candidateId: "memory-harbor",
            summary: "Mira remembers repairing a harbor rail with Lina.",
            visibility: "known_to_character",
            originFactIds: ["fact-home"],
          },
        ],
        threads: [
          {
            candidateId: "thread-lighthouse",
            summary: "Discover why the lighthouse sometimes flashes blue.",
            status: "unresolved",
            visibility: "known_to_character",
            potential: 0.9,
            originFactIds: ["fact-home"],
          },
        ],
      },
    },
    {
      id: "environment",
      section: "environment",
      summary: "Bind existing harbor world state without rewriting it.",
      provenance,
      assertions: [],
      value: environment(),
    },
  ];
}

class MemoryRecords implements ExistingCharacterMigrationRepositoryPort {
  records = new Map<string, ExistingCharacterMigrationRecord>();
  order: string[] = [];

  async getByIdempotencyKey(key: string) {
    return this.records.get(key) ?? null;
  }

  async save(record: ExistingCharacterMigrationRecord) {
    this.order.push(record.status);
    this.records.set(record.plan.idempotencyKey, structuredClone(record));
  }
}

function setup(sourceSnapshot = snapshot()) {
  let current = structuredClone(sourceSnapshot);
  const source: ExistingCharacterMigrationSourcePort = {
    read: vi.fn(async () => structuredClone(current)),
  };
  const records = new MemoryRecords();
  const upgradePort: ExistingCharacterMigrationUpgradePort = {
    apply: vi.fn(async ({ candidate }) => ({
      genesisId: candidate.id,
      marker: {},
    })),
    rollback: vi.fn(async () => undefined),
  };
  const coordinator = new ExistingCharacterMigrationCoordinator(
    source,
    records,
    upgradePort,
    {
      resolve: () => ({
        expectedWorldId: "world-1",
        expectedRegionId: "region-1",
        expectedHomeId: "home-1",
      }),
    },
  );
  return {
    coordinator,
    source,
    records,
    upgradePort,
    setSnapshot(value: ExistingCharacterMigrationSnapshot) {
      current = structuredClone(value);
    },
  };
}

describe("ExistingCharacterMigrationCoordinator", () => {
  it("keeps lazy backfill non-promoting even with a valid candidate", async () => {
    const fixture = setup();
    const inspected = await fixture.coordinator.inspect({
      characterId: "character-1",
      mode: "lazy_backfill",
      proposals: proposals(),
      now: NOW,
    });

    expect(inspected.validation?.valid).toBe(true);
    expect(inspected.plan.automaticPromotionAllowed).toBe(false);
    expect(inspected.plan.explicitUpgradeAllowed).toBe(false);
    expect(fixture.upgradePort.apply).not.toHaveBeenCalled();
  });

  it("persists recovery evidence before applying an explicit valid upgrade", async () => {
    const fixture = setup();
    const result = await fixture.coordinator.explicitUpgrade({
      characterId: "character-1",
      proposals: proposals(),
      now: NOW,
    });

    expect(result.status).toBe("applied");
    expect(result.marker?.migrationRevision).toBe(
      "existing-character-backfill.v1",
    );
    expect(fixture.records.order.slice(0, 2)).toEqual(["planned", "applied"]);
    expect(fixture.upgradePort.apply).toHaveBeenCalledTimes(1);
    const request = vi.mocked(fixture.upgradePort.apply).mock.calls[0]?.[0];
    expect(request?.candidate.status).toBe("selected");
    expect(request?.rollbackManifest.beforeSections.origin?.summary).toContain(
      "Silver Harbor",
    );
  });

  it("does not invoke the canonical adapter when policy conflicts block upgrade", async () => {
    const fixture = setup();
    const conflicting = proposals();
    conflicting[0] = {
      ...conflicting[0]!,
      assertions: [{ path: "home.name", value: "Northern Forest" }],
    };

    await expect(
      fixture.coordinator.explicitUpgrade({
        characterId: "character-1",
        proposals: conflicting,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(ExistingCharacterMigrationBlockedError);
    expect(fixture.upgradePort.apply).not.toHaveBeenCalled();
  });

  it("re-checks canonical state immediately before mutation and rejects stale plans", async () => {
    const fixture = setup();
    let reads = 0;
    vi.mocked(fixture.source.read).mockImplementation(async () => {
      reads += 1;
      if (reads < 2) return snapshot();
      return {
        ...snapshot(),
        authoritativeFacts: [
          ...snapshot().authoritativeFacts,
          {
            path: "world.region",
            value: "East Docks",
            authority: "world_state",
            sourceRef: "region-east",
          },
        ],
      };
    });

    await expect(
      fixture.coordinator.explicitUpgrade({
        characterId: "character-1",
        proposals: proposals(),
        now: NOW,
      }),
    ).rejects.toThrow("Migration source changed after planning");
    expect(fixture.upgradePort.apply).not.toHaveBeenCalled();
  });

  it("is idempotent after an applied migration and does not call apply twice", async () => {
    const fixture = setup();
    const first = await fixture.coordinator.explicitUpgrade({
      characterId: "character-1",
      proposals: proposals(),
      now: NOW,
    });
    const second = await fixture.coordinator.explicitUpgrade({
      characterId: "character-1",
      proposals: proposals(),
      now: NOW,
    });

    expect(second.plan.idempotencyKey).toBe(first.plan.idempotencyKey);
    expect(fixture.upgradePort.apply).toHaveBeenCalledTimes(1);
  });

  it("rolls back only an applied migration and treats repeated rollback as idempotent", async () => {
    const fixture = setup();
    const applied = await fixture.coordinator.explicitUpgrade({
      characterId: "character-1",
      proposals: proposals(),
      now: NOW,
    });

    await fixture.coordinator.rollback(
      "character-1",
      applied.plan.idempotencyKey,
    );
    await fixture.coordinator.rollback(
      "character-1",
      applied.plan.idempotencyKey,
    );

    expect(fixture.upgradePort.rollback).toHaveBeenCalledTimes(1);
    const record = await fixture.records.getByIdempotencyKey(
      applied.plan.idempotencyKey,
    );
    expect(record?.status).toBe("rolled_back");
  });
});
