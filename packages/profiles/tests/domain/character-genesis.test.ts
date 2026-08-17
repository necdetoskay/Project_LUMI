import { describe, expect, it } from "vitest";

import {
  validateCharacterFoundation,
  type CharacterFoundationRecord,
} from "../../src/domain";

function foundation(): CharacterFoundationRecord {
  const generatedAt = new Date("2026-08-17T06:00:00.000Z");
  return {
    id: "foundation-1",
    householdId: "household-1",
    childProfileId: "child-1",
    characterId: "character-1",
    worldId: "world-1",
    version: 1,
    genesis: {
      id: "genesis-1",
      householdId: "household-1",
      childProfileId: "child-1",
      characterId: "character-1",
      worldId: "world-1",
      version: 1,
      archetypes: ["awakened", "lost"],
      premise: "A small machine wakes beneath an abandoned observatory.",
      currentSituation: "It remembers no creator and has only a damaged map.",
      longTermDesire: "Understand why it was created and where it belongs.",
      fundamentalNeed: "Safety, belonging and a trustworthy first connection.",
      knownFacts: ["The observatory has been abandoned for a long time."],
      currentBeliefs: ["Its creator probably lived nearby."],
      unknownQuestions: ["Why are unfamiliar childhood memories stored inside it?"],
      socialEcology: [
        {
          id: "role-1",
          roleType: "maintenance_companion",
          label: "Damaged maintenance drone",
          purpose: "Provide the first cautious social connection.",
          required: true,
        },
        {
          id: "role-2",
          roleType: "unknown_presence",
          label: "Distant observer",
          purpose: "Seed uncertainty without forcing an immediate NPC encounter.",
          required: false,
        },
      ],
      provenance: {
        generationIntent: "character_genesis",
        promptKey: "character-genesis-v1",
        promptVersion: 1,
        model: "foundation-model",
        generatedAt,
      },
    },
    sagaCanon: {
      id: "saga-1",
      householdId: "household-1",
      childProfileId: "child-1",
      characterId: "character-1",
      worldId: "world-1",
      version: 1,
      centralQuestion: "Why does it remember a life it never lived?",
      deepTruth: "Its memory core preserves fragments from the lost observatory keepers.",
      longTermDesire: "Discover its purpose without becoming a copy of the people in its memory.",
      fundamentalFear: "That its own identity is not real.",
      stakes: "The memory core may contain knowledge that changes the surrounding world.",
      hiddenForces: ["A dormant observatory network"],
      possibleTransformations: ["Build a chosen identity and community"],
      revealLayers: [
        {
          id: "reveal-1",
          order: 0,
          label: "First anomaly",
          reveal: "One remembered place still physically exists.",
          prerequisites: [],
        },
      ],
      forbiddenEarlyReveals: ["memory-core-origin"],
      provenance: {
        generationIntent: "saga_foundation",
        promptKey: "saga-foundation-v1",
        promptVersion: 1,
        model: "foundation-model",
        generatedAt,
      },
    },
    sagaProgression: {
      sagaCanonId: "saga-1",
      version: 1,
      knownFacts: ["Some memories contain locations."],
      currentBeliefs: ["The memories may belong to its creator."],
      revealedClues: [],
      falseLeads: [],
      unresolvedQuestions: ["Whose memories are these?"],
      revealStage: 0,
      updatedAt: generatedAt,
    },
    createdAt: generatedAt,
    updatedAt: generatedAt,
  };
}

describe("Character Genesis foundation", () => {
  it("accepts a scoped foundation with composable non-species archetypes", () => {
    expect(() => validateCharacterFoundation(foundation())).not.toThrow();
  });

  it("rejects duplicate genesis archetypes", () => {
    const value = foundation();
    value.genesis.archetypes = ["lost", "lost"];

    expect(() => validateCharacterFoundation(value)).toThrow(
      "Genesis archetypes must be unique",
    );
  });

  it("rejects cross-household saga state", () => {
    const value = foundation();
    value.sagaCanon.householdId = "other-household";

    expect(() => validateCharacterFoundation(value)).toThrow(
      "Genesis and saga records must share the foundation scope",
    );
  });

  it("rejects progression linked to another Saga Canon", () => {
    const value = foundation();
    value.sagaProgression.sagaCanonId = "another-saga";

    expect(() => validateCharacterFoundation(value)).toThrow(
      "Saga progression must reference its Saga Canon",
    );
  });

  it("protects deep truth from early knowledge/belief projection", () => {
    const value = foundation();
    value.sagaProgression.knownFacts = [value.sagaCanon.deepTruth];

    expect(() => validateCharacterFoundation(value)).toThrow(
      "Protected deep truth cannot appear in current knowledge or belief",
    );
  });

  it("permits sparse social ecology for a valid lone genesis", () => {
    const value = foundation();
    value.genesis.archetypes = ["hatched", "last_known"];
    value.genesis.socialEcology = [];
    value.genesis.premise = "A hatchling emerges alone on an empty volcanic island.";

    expect(() => validateCharacterFoundation(value)).not.toThrow();
  });

  it("rejects duplicate social-ecology role ids", () => {
    const value = foundation();
    value.genesis.socialEcology.push({
      id: "role-1",
      roleType: "mentor",
      label: "Ancient watcher",
      purpose: "Potential future mentor.",
      required: false,
    });

    expect(() => validateCharacterFoundation(value)).toThrow(
      "Social ecology role ids must be non-empty and unique",
    );
  });

  it("rejects a bootstrap manifest outside foundation scope", () => {
    const value = foundation();
    value.bootstrapManifest = {
      id: "bootstrap-1",
      householdId: "other-household",
      childProfileId: value.childProfileId,
      characterId: value.characterId,
      worldId: value.worldId,
      foundationVersion: 1,
      bootstrapVersion: 1,
      idempotencyKey: "bootstrap:foundation-1:v1",
      status: "planned",
      materialized: [],
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };

    expect(() => validateCharacterFoundation(value)).toThrow(
      "Bootstrap manifest must share the foundation scope",
    );
  });
});
