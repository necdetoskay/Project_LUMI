import { describe, expect, it } from "vitest";

import {
  createGenesisSocialState,
  deduplicateGenesisNpcCandidates,
  deriveDirectionalRelationships,
  validateGenesisSocialState,
  type GenesisSocialNpcCandidate,
} from "../../src/domain/character-genesis-social";

const candidates: GenesisSocialNpcCandidate[] = [
  {
    identityKey: "toma-usta",
    displayName: "Toma Usta",
    role: "mentor",
    source: "origin",
    originFactIds: ["fact-bakery"],
    personality: {
      traits: ["patient", "warm"],
      interactionStyle: "calm guidance",
      futureInteractionPotential: "high",
    },
  },
  {
    identityKey: "Toma Usta",
    displayName: "Usta Toma",
    role: "neighbor",
    source: "derived",
    originFactIds: ["fact-bakery"],
    aliases: ["Toma"],
    personality: {
      traits: ["helpful"],
      interactionStyle: "practical",
      futureInteractionPotential: "medium",
    },
  },
];

describe("Character Genesis social graph", () => {
  it("deduplicates origin and derived NPCs into one canonical identity", () => {
    const npcs = deduplicateGenesisNpcCandidates(candidates, "seed-1");

    expect(npcs).toHaveLength(1);
    expect(npcs[0]).toMatchObject({
      identityKey: "toma-usta",
      displayName: "Toma Usta",
      role: "mentor",
      source: "origin",
    });
    expect(npcs[0]?.aliases).toEqual(expect.arrayContaining(["Toma"]));
  });

  it("derives A->B and B->A independently", () => {
    const npcs = deduplicateGenesisNpcCandidates(candidates, "seed-2");
    const edges = deriveDirectionalRelationships({
      characterId: "character-mira",
      characterIdentityKey: "mira",
      npcs,
      seed: "seed-2",
      evidence: [
        {
          fromIdentityKey: "mira",
          toIdentityKey: "toma-usta",
          dimension: "trust",
          direction: "high",
          strength: "strong",
          sourceFactIds: ["fact-bakery"],
          rationale: "Mira has relied on Toma for years.",
        },
        {
          fromIdentityKey: "toma-usta",
          toIdentityKey: "mira",
          dimension: "trust",
          direction: "neutral",
          strength: "moderate",
          sourceFactIds: ["fact-bakery"],
          rationale: "Toma cares for Mira but still supervises her.",
        },
      ],
    });

    expect(edges).toHaveLength(2);
    const forward = edges.find(
      (edge) => edge.fromCandidateId === "character-mira",
    );
    const reverse = edges.find(
      (edge) => edge.toCandidateId === "character-mira",
    );
    expect(forward?.trust).toBeGreaterThan(reverse?.trust ?? 1);
  });

  it("does not force social population for an isolated character", () => {
    const social = createGenesisSocialState({
      characterId: "character-alone",
      characterIdentityKey: "alone",
      candidates: [],
      evidence: [],
      seed: "seed-isolated",
    });

    expect(social.npcs).toEqual([]);
    expect(social.relationships).toEqual([]);
  });

  it("flags missing provenance facts", () => {
    const social = createGenesisSocialState({
      characterId: "character-mira",
      characterIdentityKey: "mira",
      candidates,
      evidence: [
        {
          fromIdentityKey: "mira",
          toIdentityKey: "toma-usta",
          dimension: "affection",
          direction: "high",
          strength: "strong",
          sourceFactIds: ["fact-missing"],
          rationale: "Strong bond.",
        },
      ],
      seed: "seed-3",
    });

    const issues = validateGenesisSocialState({
      characterId: "character-mira",
      social,
      originFactIds: ["fact-bakery"],
    });

    expect(issues.map((issue) => issue.code)).toContain(
      "GENESIS_SOCIAL_EVIDENCE_FACT_MISSING",
    );
  });
});