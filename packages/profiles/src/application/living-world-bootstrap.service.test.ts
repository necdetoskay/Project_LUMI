import { describe, expect, it, vi } from "vitest";

import type {
  CharacterFoundationRecord,
  FoundationProvenance,
  LivingWorldBootstrapManifest,
} from "../domain/character-genesis";
import {
  LivingWorldBootstrapService,
  type LivingWorldBootstrapManifestStore,
  type LivingWorldBootstrapMaterializer,
} from "./living-world-bootstrap.service";

const at = new Date("2026-08-21T12:00:00.000Z");

function provenance(): FoundationProvenance {
  return {
    generationIntent: "test",
    promptKey: "test",
    promptVersion: 1,
    model: "test-model",
    provider: "test",
    generatedAt: at,
  };
}

function foundation(
  bootstrapStatus: LivingWorldBootstrapManifest["status"] = "planned",
): CharacterFoundationRecord {
  const bootstrapManifest: LivingWorldBootstrapManifest = {
    id: "bootstrap-manifest",
    householdId: "household",
    childProfileId: "child",
    characterId: "character",
    worldId: "world",
    foundationVersion: 1,
    bootstrapVersion: 1,
    idempotencyKey: "bootstrap:test",
    status: bootstrapStatus,
    materialized: [],
    createdAt: at,
    updatedAt: at,
  };

  return {
    id: "foundation",
    householdId: "household",
    childProfileId: "child",
    characterId: "character",
    worldId: "world",
    version: 1,
    genesis: {
      id: "genesis",
      householdId: "household",
      childProfileId: "child",
      characterId: "character",
      worldId: "world",
      version: 1,
      archetypes: ["rooted"],
      premise: "A child explorer arrives in a living forest.",
      currentSituation: "A nearby friend can help with the first discovery.",
      longTermDesire: "Understand the forest.",
      fundamentalNeed: "Belong safely.",
      knownFacts: [],
      currentBeliefs: [],
      unknownQuestions: [],
      socialEcology: [
        {
          id: "friend-role",
          roleType: "friend",
          label: "Friend",
          purpose: "Support the opening journey.",
          required: true,
        },
      ],
      provenance: provenance(),
    },
    sagaCanon: {
      id: "saga",
      householdId: "household",
      childProfileId: "child",
      characterId: "character",
      worldId: "world",
      version: 1,
      centralQuestion: "What is changing in the forest?",
      deepTruth: "The forest is learning from every visitor.",
      longTermDesire: "Understand the forest.",
      fundamentalFear: "Losing the path home.",
      stakes: "The forest may become unsafe.",
      hiddenForces: [],
      possibleTransformations: [],
      revealLayers: [],
      forbiddenEarlyReveals: ["deep-truth"],
      provenance: provenance(),
    },
    sagaProgression: {
      sagaCanonId: "saga",
      version: 1,
      knownFacts: [],
      currentBeliefs: [],
      revealedClues: [],
      falseLeads: [],
      unresolvedQuestions: [],
      revealStage: 0,
      updatedAt: at,
    },
    bootstrapManifest,
    createdAt: at,
    updatedAt: at,
  };
}

function materializer(
  finalize: NonNullable<LivingWorldBootstrapMaterializer["finalize"]>,
): LivingWorldBootstrapMaterializer {
  return {
    resolveLocalContext: vi.fn(async () => []),
    ensureNpc: vi.fn(async () => ({
      npcId: "npc-1",
      npcReused: false,
      relationshipEntityId: "character:npc-1",
      relationshipReused: false,
    })),
    finalize,
  };
}

describe("LivingWorldBootstrapService completion lifecycle", () => {
  it("runs finalize before persisting completed", async () => {
    const events: string[] = [];
    const store: LivingWorldBootstrapManifestStore = {
      save: vi.fn(async (_foundation, manifest) => {
        events.push(`save:${manifest.status}`);
      }),
    };
    const finalize = vi.fn(async () => {
      events.push("finalize");
    });

    const result = await new LivingWorldBootstrapService(
      materializer(finalize),
      store,
      () => at,
    ).run(foundation());

    expect(result.status).toBe("completed");
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(events.at(-2)).toBe("finalize");
    expect(events.at(-1)).toBe("save:completed");
  });

  it("persists failed and never completed when finalize fails", async () => {
    const statuses: string[] = [];
    const store: LivingWorldBootstrapManifestStore = {
      save: vi.fn(async (_foundation, manifest) => {
        statuses.push(manifest.status);
      }),
    };
    const finalize = vi.fn(async () => {
      throw new Error("INITIAL_ADVENTURE_SEED_FAILED");
    });

    await expect(
      new LivingWorldBootstrapService(
        materializer(finalize),
        store,
        () => at,
      ).run(foundation()),
    ).rejects.toThrow("INITIAL_ADVENTURE_SEED_FAILED");

    expect(statuses).not.toContain("completed");
    expect(statuses.at(-1)).toBe("failed");
  });

  it("does not finalize again for an already completed manifest", async () => {
    const store: LivingWorldBootstrapManifestStore = {
      save: vi.fn(async () => undefined),
    };
    const finalize = vi.fn(async () => undefined);

    const result = await new LivingWorldBootstrapService(
      materializer(finalize),
      store,
      () => at,
    ).run(foundation("completed"));

    expect(result.status).toBe("completed");
    expect(finalize).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
  });
});
