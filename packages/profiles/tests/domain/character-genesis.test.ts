import { describe, expect, it } from "vitest";

import {
  assertCharacterFoundation,
  CharacterFoundationInvariantError,
  type CharacterFoundation,
} from "../../src/domain";

function foundation(
  overrides: Partial<CharacterFoundation> = {},
): CharacterFoundation {
  return {
    schemaVersion: 1,
    householdId: "household-1",
    childProfileId: "child-1",
    characterId: "character-1",
    worldId: "world-1",
    status: "bootstrap_pending",
    genesis: {
      version: 1,
      archetypes: ["lost"],
      publicPremise: "A traveller wakes near a silent lake.",
      originCondition: "The traveller remembers only a symbol.",
      currentSituation: "Safe for now, but without a known home.",
      immediateNeeds: ["shelter"],
      mediumTermDesires: ["understand the symbol"],
      currentBeliefs: ["someone nearby may recognize the symbol"],
      importantUnknowns: ["why the memory is missing"],
      growthPotential: "Can build trust and a new sense of belonging.",
    },
    socialEcology: {
      summary: "Sparse contact around the lake.",
      allowNoFamily: true,
      allowSparseSocialWorld: true,
      roles: [
        {
          stableKey: "rescuer",
          roleKind: "rescuer",
          label: "A cautious rescuer",
          purpose: "First relationship and source of local knowledge",
          required: true,
          materializationHint: "npc",
        },
      ],
    },
    coreTension: {
      immediateNeed: "find safety",
      mediumTermDirection: "recover trustworthy clues",
      centralTension: "belonging versus fear of a hidden past",
    },
    sagaCanon: {
      centralQuestion: "Why was the memory removed?",
      deepTruth: "The character chose to hide a dangerous route in their own memory.",
      longTermDesire: "Understand the past without losing the new life.",
      fundamentalFear: "Becoming the danger others fear.",
      stakes: ["the hidden route may be rediscovered"],
      hiddenForces: ["a group still searching for the route"],
      possibleTransformations: ["from isolated survivor to trusted guide"],
      revealLayers: [
        {
          id: "layer-1",
          order: 1,
          description: "The symbol belongs to an old route network.",
          unlockCondition: "two independent clues",
        },
      ],
      forbiddenEarlyReveals: ["The character chose the memory loss."],
    },
    sagaProgression: {
      knownFacts: ["There is an unfamiliar symbol."],
      currentBeliefs: ["The symbol may identify a place."],
      revealedClues: [],
      falseLeads: [],
      unresolvedQuestions: ["Who recognizes the symbol?"],
      revealStage: 0,
    },
    provenance: {
      generationIntent: "character_genesis",
      modelId: null,
      promptKey: null,
      promptVersion: null,
      rngSeed: "seed-1",
      sourceOriginPackageId: null,
      sourceCreationCycleId: "cycle-1",
      generatedAt: "2026-08-17T00:00:00.000Z",
    },
    bootstrap: {
      version: 1,
      status: "pending",
      attempt: 0,
      startedAt: null,
      completedAt: null,
      lastErrorCode: null,
      materializations: [],
    },
    ...overrides,
  };
}

describe("Character Genesis foundation invariants", () => {
  it("allows a human-like lost genesis with no fixed family topology", () => {
    expect(assertCharacterFoundation(foundation())).toBeTruthy();
  });

  it("allows a lone hatchling with environmental roles instead of family NPCs", () => {
    const candidate = foundation({
      genesis: {
        ...foundation().genesis,
        archetypes: ["hatched", "last_known"],
        publicPremise: "A hatchling emerges alone among volcanic glass.",
      },
      socialEcology: {
        summary: "No family is present; survival ecology is meaningful.",
        allowNoFamily: true,
        allowSparseSocialWorld: true,
        roles: [
          {
            stableKey: "storm-threat",
            roleKind: "predator_or_threat",
            label: "Ash storm",
            purpose: "Creates a survival pressure without fabricating people",
            required: true,
            materializationHint: "environmental_force",
          },
          {
            stableKey: "distant-signal",
            roleKind: "distant_kin_signal",
            label: "A distant answering call",
            purpose: "Long-horizon relationship possibility",
            required: false,
            materializationHint: "signal",
          },
        ],
      },
    });

    expect(assertCharacterFoundation(candidate)).toBeTruthy();
  });

  it("rejects deep truth already exposed as initial knowledge", () => {
    const base = foundation();
    const invalid = foundation({
      sagaProgression: {
        ...base.sagaProgression,
        knownFacts: [base.sagaCanon.deepTruth],
      },
    });

    expect(() => assertCharacterFoundation(invalid)).toThrow(
      CharacterFoundationInvariantError,
    );
  });

  it("rejects forbidden reveal content already exposed as a clue", () => {
    const base = foundation();
    const invalid = foundation({
      sagaProgression: {
        ...base.sagaProgression,
        revealedClues: [base.sagaCanon.forbiddenEarlyReveals[0]!],
      },
    });

    expect(() => assertCharacterFoundation(invalid)).toThrow(
      /forbidden early reveal/,
    );
  });

  it("rejects duplicate materialization refs across retries", () => {
    const duplicated = {
      stableKey: "rescuer",
      authority: "npc-intelligence" as const,
      entityType: "npc",
      entityId: "npc-1",
      action: "created" as const,
    };
    const invalid = foundation({
      bootstrap: {
        ...foundation().bootstrap,
        materializations: [duplicated, { ...duplicated, stableKey: "copy" }],
      },
    });

    expect(() => assertCharacterFoundation(invalid)).toThrow(
      /materialization reference must be unique/,
    );
  });
});
