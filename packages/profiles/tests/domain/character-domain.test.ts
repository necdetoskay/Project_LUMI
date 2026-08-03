import { describe, it, expect } from "vitest";
import {
  LumiCharacter,
  validateTraitVector,
  validateEmotionVector,
  validateNeeds,
  validateGoals,
  validateInfluenceVector,
  validateRelationships,
  validateTraitDelta,
  resolveTraitDeltaAgainstState,
  validateCharacterSubtype,
  validateCharacterLifecycleStage,
  validateSafetyBounds,
  ValidationError,
  MAX_TRAIT_DELTA,
  DEFAULT_CHILD_AVATAR_TRAITS,
  DEFAULT_CHILD_AVATAR_EMOTIONS,
  DEFAULT_NPC_TRAITS,
  DEFAULT_NPC_EMOTIONS,
  type NeedState,
  type GoalState,
  type TraitDeltaEntry,
} from "../../src/domain";

const SAFE_BASE = {
  id: "20c2d118-2b14-4ef1-9082-2ec6d2d99401",
  childProfileId: "9a3c1f5c-8b15-4f03-9d07-7f0e2f6d5c7a",
  householdId: "aa3c1f5c-8b15-4f03-9d07-7f0e2f6d5c7a",
  broadKind: "human" as const,
  characterType: "explorer" as const,
  originMode: "auto" as const,
  firstOriginPackageId: "66c5b5bb-4b65-4d9f-b7d5-bc0a2c6d77be",
  safetyBounds: {
    ageBand: "6-8" as const,
    contentBoundary: "moderate" as const,
    requireParentApprovalForAi: false,
  },
} as const;

function makeCharacter(subtype: string = "child_avatar") {
  return LumiCharacter.create({
    ...SAFE_BASE,
    name: "Lumi",
    subtype: "yıldız kaşifi",
    originConcept: "Bir macera.",
    startingRegionArchetype: "orman",
    startingLocation: "orman girişi",
    homeArchetype: "ağaç ev",
    nearbyNpcSeed: "yaşlı bekçi",
    firstMysterySeed: "şarkı",
    universeSeed: "lumi-seed",
    characterSubtype: subtype as never,
  });
}

describe("S06 - Trait Vector Validation", () => {
  it("accepts valid trait vector with all dimensions", () => {
    expect(() => validateTraitVector(DEFAULT_CHILD_AVATAR_TRAITS)).not.toThrow();
  });

  it("rejects unknown trait dimension", () => {
    expect(() => validateTraitVector({ courage: 0.5, unknown_trait: 0.3 } as never)).toThrow(ValidationError);
  });

  it("rejects NaN trait value", () => {
    expect(() => validateTraitVector({ courage: NaN })).toThrow(ValidationError);
  });

  it("rejects out-of-range trait value (negative)", () => {
    expect(() => validateTraitVector({ courage: -0.1 })).toThrow(ValidationError);
  });

  it("rejects out-of-range trait value (>1)", () => {
    expect(() => validateTraitVector({ courage: 1.5 })).toThrow(ValidationError);
  });

  it("rejects null trait vector", () => {
    expect(() => validateTraitVector(null as never)).toThrow(ValidationError);
  });
});

describe("S06 - Emotion Vector Validation", () => {
  it("accepts valid emotion vector", () => {
    expect(() => validateEmotionVector(DEFAULT_CHILD_AVATAR_EMOTIONS)).not.toThrow();
  });

  it("rejects unknown emotion dimension", () => {
    expect(() => validateEmotionVector({ joy: 0.5, unknown: 0.3 } as never)).toThrow(ValidationError);
  });

  it("rejects NaN emotion value", () => {
    expect(() => validateEmotionVector({ joy: NaN })).toThrow(ValidationError);
  });

  it("rejects out-of-range emotion value", () => {
    expect(() => validateEmotionVector({ joy: 2.0 })).toThrow(ValidationError);
  });
});

describe("S06 - Needs Validation", () => {
  it("accepts valid needs array", () => {
    expect(() => validateNeeds([{ needType: "hunger", value: 0.5, decay: 0.05 }])).not.toThrow();
  });

  it("rejects unknown need type", () => {
    expect(() => validateNeeds([{ needType: "unknown" as never, value: 0.5, decay: 0.05 }])).toThrow(ValidationError);
  });

  it("rejects need value out of range", () => {
    expect(() => validateNeeds([{ needType: "hunger", value: -0.1, decay: 0.05 }])).toThrow(ValidationError);
  });

  it("rejects NaN need value", () => {
    expect(() => validateNeeds([{ needType: "hunger", value: NaN, decay: 0.05 }])).toThrow(ValidationError);
  });
});

describe("S06 - Goals Validation", () => {
  it("accepts valid goals array", () => {
    const goals: GoalState[] = [{
      id: "g1", needType: "hunger", description: "Find food",
      priority: 1, status: "active",
      createdAt: new Date(), completedAt: null,
    }];
    expect(() => validateGoals(goals)).not.toThrow();
  });

  it("rejects unknown need type in goal", () => {
    const goals = [{
      id: "g1", needType: "unknown" as never, description: "Find food",
      priority: 1, status: "active" as const,
      createdAt: new Date(), completedAt: null,
    }];
    expect(() => validateGoals(goals)).toThrow(ValidationError);
  });

  it("rejects invalid goal status", () => {
    const goals: GoalState[] = [{
      id: "g1", needType: "hunger", description: "Find food",
      priority: 1, status: "invalid" as never,
      createdAt: new Date(), completedAt: null,
    }];
    expect(() => validateGoals(goals)).toThrow(ValidationError);
  });
});

describe("S06 - Influence Vector Validation", () => {
  it("accepts valid influence vector", () => {
    expect(() => validateInfluenceVector({
      emotional: 0, social: 0.5, cultural: 0.3, educational: 0.1,
      political: 0, environmental: 0.8, familial: 0.6, spiritual: 0, historical: 0.2,
    })).not.toThrow();
  });

  it("rejects influence value out of range", () => {
    expect(() => validateInfluenceVector({
      emotional: 2, social: 0, cultural: 0, educational: 0,
      political: 0, environmental: 0, familial: 0, spiritual: 0, historical: 0,
    })).toThrow(ValidationError);
  });
});

describe("S06 - Relationships Validation", () => {
  it("accepts valid relationships array", () => {
    expect(() => validateRelationships([{
      targetCharacterId: "char-2", trust: 0.7, affinity: 0.6, familiarity: 0.4,
      relationshipType: "friend",
    }])).not.toThrow();
  });

  it("rejects duplicate relationships", () => {
    expect(() => validateRelationships([
      { targetCharacterId: "char-2", trust: 0.7, affinity: 0.6, familiarity: 0.4, relationshipType: "friend" },
      { targetCharacterId: "char-2", trust: 0.3, affinity: 0.2, familiarity: 0.1, relationshipType: "rival" },
    ])).toThrow(ValidationError);
  });

  it("rejects trust out of range", () => {
    expect(() => validateRelationships([{
      targetCharacterId: "char-2", trust: 1.5, affinity: 0.5, familiarity: 0.5,
      relationshipType: "neutral",
    }])).toThrow(ValidationError);
  });
});

describe("S06 - Trait Delta Validation", () => {
  it("accepts valid trait delta with evidence (shape-only validation)", () => {
    expect(() => validateTraitDelta({
      dimension: "courage", oldValue: 0.5, newValue: 0.6,
      evidence: "Character faced a fear of heights", deltaMagnitude: 0.1,
    })).not.toThrow();
  });

  it("accepts trait delta without optional oldValue (server will resolve from state)", () => {
    expect(() => validateTraitDelta({
      dimension: "courage", newValue: 0.6,
      evidence: "Character faced a fear of heights",
    })).not.toThrow();
  });

  it("rejects trait delta without evidence", () => {
    expect(() => validateTraitDelta({
      dimension: "courage", oldValue: 0.5, newValue: 0.55,
      evidence: "", deltaMagnitude: 0.05,
    })).toThrow(ValidationError);
  });

  it("rejects unknown dimension in delta", () => {
    expect(() => validateTraitDelta({
      dimension: "unknown" as never, oldValue: 0.5, newValue: 0.55,
      evidence: "Test", deltaMagnitude: 0.05,
    })).toThrow(ValidationError);
  });

  it("rejects out-of-range client-supplied oldValue", () => {
    expect(() => validateTraitDelta({
      dimension: "courage", oldValue: 1.5, newValue: 0.6,
      evidence: "Test",
    })).toThrow(ValidationError);
  });
});

describe("S06 - Trait Delta Bounded Resolution (server-computed)", () => {
  it("rejects forged oldValue that does not match actual current value", () => {
    expect(() => resolveTraitDeltaAgainstState(0.5, {
      dimension: "courage", oldValue: 0.85, newValue: 1.0,
      evidence: "Forged evidence",
    })).toThrow(ValidationError);
  });

  it("accepts valid oldValue matching actual current value (courage 0.5 → 0.65)", () => {
    const resolved = resolveTraitDeltaAgainstState(0.5, {
      dimension: "courage", oldValue: 0.5, newValue: 0.65,
      evidence: "Helped a friend",
    });
    expect(resolved.oldValue).toBe(0.5);
    expect(resolved.newValue).toBe(0.65);
    expect(resolved.deltaMagnitude).toBeCloseTo(0.15, 9);
    expect(resolved.dimension).toBe("courage");
  });

  it("rejects delta exceeding MAX_TRAIT_DELTA based on actual current value", () => {
    expect(() => resolveTraitDeltaAgainstState(0.5, {
      dimension: "courage", oldValue: 0.5, newValue: 0.9,
      evidence: "Faced fear",
    })).toThrow(ValidationError);
  });

  it("computes server-side deltaMagnitude even when client omits or forges oldValue", () => {
    const resolved = resolveTraitDeltaAgainstState(0.5, {
      dimension: "courage", newValue: 0.65,
      evidence: "Server-computed delta",
    });
    expect(resolved.oldValue).toBe(0.5);
    expect(resolved.deltaMagnitude).toBeCloseTo(0.15, 9);
  });

  it("rejects forged oldValue with TRAIT_OLD_VALUE_MISMATCH code", () => {
    try {
      resolveTraitDeltaAgainstState(0.5, {
        dimension: "courage", oldValue: 0.85, newValue: 1.0,
        evidence: "Forged",
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).code).toBe("TRAIT_OLD_VALUE_MISMATCH");
    }
  });
});

describe("S06 - LumiCharacter: Child Avatar vs NPC Separation", () => {
  it("creates child avatar with default child avatar traits", () => {
    const c = makeCharacter("child_avatar");
    expect(c.isChildAvatar()).toBe(true);
    expect(c.isNpc()).toBe(false);
    const state = c.getState();
    expect(state.characterSubtype).toBe("child_avatar");
    expect(state.lifecycleStage).toBe("childhood");
    expect(state.version).toBe(1);
  });

  it("creates NPC with default NPC traits", () => {
    const c = makeCharacter("npc");
    expect(c.isNpc()).toBe(true);
    expect(c.isChildAvatar()).toBe(false);
    const state = c.getState();
    expect(state.characterSubtype).toBe("npc");
    expect(state.traits.courage).toBe(DEFAULT_NPC_TRAITS.courage);
  });

  it("rejects NPC with empty name (base invariant still enforced)", () => {
    expect(() => LumiCharacter.create({
      ...SAFE_BASE, name: "", subtype: "merchant",
      originConcept: "Shop", startingRegionArchetype: "village",
      startingLocation: "shop", homeArchetype: "house",
      nearbyNpcSeed: "customer", firstMysterySeed: "mystery",
      universeSeed: "s", characterSubtype: "npc",
    })).toThrow(ValidationError);
  });

  it("child avatar cannot have relationships at creation", () => {
    expect(() => LumiCharacter.create({
      ...SAFE_BASE, name: "Lumi", subtype: "kid",
      originConcept: "Explore", startingRegionArchetype: "forest",
      startingLocation: "entrance", homeArchetype: "treehouse",
      nearbyNpcSeed: "NPC", firstMysterySeed: "mystery",
      universeSeed: "s",
      relationships: [{ targetCharacterId: "npc-1", trust: 0.5, affinity: 0.5, familiarity: 0, relationshipType: "friend" }],
    })).toThrow(ValidationError);
  });
});

describe("S06 - LumiCharacter: Trait Delta with Evidence", () => {
  it("applies bounded trait delta with evidence", () => {
    const c = makeCharacter();
    const oldCourage = c.getState().traits.courage ?? 0.5;
    c.applyTraitDelta({
      dimension: "courage", oldValue: oldCourage, newValue: Math.min(1, oldCourage + 0.1),
      evidence: "Character helped a friend in need", deltaMagnitude: 0.1,
    });
    expect(c.getState().traits.courage).toBe(Math.min(1, oldCourage + 0.1));
    expect(c.getVersion()).toBe(2);
  });

  it("rejects trait delta on NPC characters", () => {
    const c = makeCharacter("npc");
    expect(() => c.applyTraitDelta({
      dimension: "courage", oldValue: 0.5, newValue: 0.55,
      evidence: "Test", deltaMagnitude: 0.05,
    })).toThrow(ValidationError);
  });
});

describe("S06 - LumiCharacter: Forged oldValue / Server-Authoritative Delta", () => {
  it("rejects forged oldValue when current state value differs (courage 0.5 → forged 0.85 → 1.0)", () => {
    const c = makeCharacter();
    expect(c.getState().traits.courage).toBe(DEFAULT_CHILD_AVATAR_TRAITS.courage);
    expect(() => c.applyTraitDelta({
      dimension: "courage", oldValue: 0.85, newValue: 1.0,
      evidence: "Forged payload",
    })).toThrow(ValidationError);
    // State must not have changed
    expect(c.getState().traits.courage).toBe(DEFAULT_CHILD_AVATAR_TRAITS.courage);
    expect(c.getVersion()).toBe(1);
  });

  it("accepts a valid delta with matching oldValue and returns server-computed resolved delta", () => {
    const c = makeCharacter();
    const current = c.getState().traits.courage ?? 0.5;
    const resolved = c.applyTraitDelta({
      dimension: "courage", oldValue: current, newValue: current + 0.15,
      evidence: "Brave moment",
    });
    expect(resolved.oldValue).toBe(current);
    expect(resolved.newValue).toBe(current + 0.15);
    expect(resolved.deltaMagnitude).toBeCloseTo(0.15, 9);
    expect(c.getState().traits.courage).toBeCloseTo(current + 0.15, 9);
  });

  it("applyTraitDeltas rejects forged oldValue before mutating ANY trait (atomic batch)", () => {
    const c = makeCharacter();
    const originalCourage = c.getState().traits.courage;
    const originalCuriosity = c.getState().traits.curiosity;
    expect(() => c.applyTraitDeltas([
      { dimension: "courage", oldValue: 0.5, newValue: 0.65, evidence: "valid" },
      { dimension: "curiosity", oldValue: 0.85, newValue: 1.0, evidence: "forged" },
    ])).toThrow(ValidationError);
    // Neither trait must have been mutated, version unchanged
    expect(c.getState().traits.courage).toBe(originalCourage);
    expect(c.getState().traits.curiosity).toBe(originalCuriosity);
    expect(c.getVersion()).toBe(1);
  });

  it("applyTraitDeltas returns server-computed ResolvedTraitDelta[] on success", () => {
    const c = makeCharacter();
    const currentCourage = c.getState().traits.courage ?? 0.5;
    const currentCuriosity = c.getState().traits.curiosity ?? 0.6;
    const resolved = c.applyTraitDeltas([
      { dimension: "courage", newValue: currentCourage + 0.1, evidence: "b1" },
      { dimension: "curiosity", oldValue: currentCuriosity, newValue: currentCuriosity + 0.05, evidence: "b2" },
    ]);
    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.oldValue).toBe(currentCourage);
    expect(resolved[0]?.deltaMagnitude).toBeCloseTo(0.1, 9);
    expect(resolved[1]?.oldValue).toBe(currentCuriosity);
    expect(resolved[1]?.deltaMagnitude).toBeCloseTo(0.05, 9);
  });

  it("rejects duplicate trait dimension in same batch with DUPLICATE_TRAIT_DELTA_DIMENSION", () => {
    const c = makeCharacter();
    expect(() => c.applyTraitDeltas([
      { dimension: "courage", newValue: 0.55, evidence: "first" },
      { dimension: "courage", newValue: 0.60, evidence: "second" },
    ])).toThrow(ValidationError);
  });

  it("duplicate dimension rejection preserves atomicity: trait state and version unchanged", () => {
    const c = makeCharacter();
    const originalCourage = c.getState().traits.courage;
    const originalCuriosity = c.getState().traits.curiosity;
    expect(() => c.applyTraitDeltas([
      { dimension: "courage", newValue: 0.55, evidence: "first" },
      { dimension: "curiosity", newValue: 0.65, evidence: "valid" },
      { dimension: "courage", newValue: 0.60, evidence: "duplicate" },
    ])).toThrow(ValidationError);
    expect(c.getState().traits.courage).toBe(originalCourage);
    expect(c.getState().traits.curiosity).toBe(originalCuriosity);
    expect(c.getVersion()).toBe(1);
  });

  it("duplicate dimension rejection includes correct error code", () => {
    const c = makeCharacter();
    try {
      c.applyTraitDeltas([
        { dimension: "courage", newValue: 0.55, evidence: "a" },
        { dimension: "courage", newValue: 0.60, evidence: "b" },
      ]);
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as ValidationError).code).toBe("DUPLICATE_TRAIT_DELTA_DIMENSION");
    }
  });

  it("single applyTraitDelta is unaffected by duplicate guard (only batch enforces dedup)", () => {
    const c = makeCharacter();
    // A single delta must still work — no duplicate check needed.
    const resolved = c.applyTraitDelta({
      dimension: "courage", newValue: 0.55,
      evidence: "single delta",
    });
    expect(resolved.dimension).toBe("courage");
    expect(c.getVersion()).toBe(2);
  });
});

describe("S06 - LumiCharacter: Active Location Invariant", () => {
  it("sets and clears active location", () => {
    const c = makeCharacter();
    expect(c.getState().activeLocationId).toBeNull();

    c.setActiveLocation("loc-1", "forest");
    expect(c.getState().activeLocationId).toBe("loc-1");
    expect(c.getState().activeLocationType).toBe("forest");
    expect(c.getVersion()).toBe(2);

    c.clearActiveLocation();
    expect(c.getState().activeLocationId).toBeNull();
    expect(c.getState().activeLocationType).toBeNull();
    expect(c.getVersion()).toBe(3);
  });

  it("enforces single active location (set replaces old)", () => {
    const c = makeCharacter();
    c.setActiveLocation("loc-1", "forest");
    c.setActiveLocation("loc-2", "cave");
    expect(c.getState().activeLocationId).toBe("loc-2");
    expect(c.getState().activeLocationType).toBe("cave");
  });
});

describe("S06 - LumiCharacter: Optimistic Version", () => {
  it("starts at version 1", () => {
    const c = makeCharacter();
    expect(c.getVersion()).toBe(1);
  });

  it("increments version on each mutation", () => {
    const c = makeCharacter();
    c.applyTraitDelta({
      dimension: "courage", oldValue: 0.5, newValue: 0.55,
      evidence: "Test", deltaMagnitude: 0.05,
    });
    expect(c.getVersion()).toBe(2);
    c.updateEmotions({ joy: 0.7, sadness: 0.1, fear: 0.2, anger: 0.1, surprise: 0.3, trust: 0.5 });
    expect(c.getVersion()).toBe(3);
  });
});

describe("S06 - LumiCharacter: Goal Management", () => {
  it("adds and completes goals", () => {
    const c = makeCharacter();
    c.addGoal({
      id: "g1", needType: "curiosity", description: "Explore the forest",
      priority: 1, status: "active", createdAt: new Date(), completedAt: null,
    });
    expect(c.getState().goals).toHaveLength(1);
    expect(c.getVersion()).toBe(2);

    c.completeGoal("g1");
    expect(c.getState().goals[0]?.status).toBe("completed");
    expect(c.getVersion()).toBe(3);
  });
});

describe("S06 - LumiCharacter: Lifecycle Stage", () => {
  it("NPC can change lifecycle stage", () => {
    const c = makeCharacter("npc");
    c.setLifecycleStage("adulthood");
    expect(c.getState().lifecycleStage).toBe("adulthood");
  });

  it("child avatar lifecycle is fixed to childhood", () => {
    const c = makeCharacter("child_avatar");
    expect(() => c.setLifecycleStage("adulthood")).toThrow(ValidationError);
  });
});

describe("S06 - LumiCharacter: Directional Relationships", () => {
  it("NPC can manage relationships", () => {
    const c = makeCharacter("npc");
    c.addRelationship({
      targetCharacterId: "other-char", trust: 0.6, affinity: 0.7,
      familiarity: 0.3, relationshipType: "friend",
    });
    expect(c.getState().relationships).toHaveLength(1);

    c.updateRelationship("other-char", { trust: 0.8 });
    expect(c.getState().relationships[0]?.trust).toBe(0.8);
  });

  it("child avatar cannot manage relationships", () => {
    const c = makeCharacter("child_avatar");
    expect(() => c.addRelationship({
      targetCharacterId: "npc-1", trust: 0.5, affinity: 0.5,
      familiarity: 0, relationshipType: "friend",
    })).toThrow(ValidationError);
  });
});

describe("S06 - Character Subtype Validation", () => {
  it("accepts valid subtypes", () => {
    expect(() => validateCharacterSubtype("child_avatar")).not.toThrow();
    expect(() => validateCharacterSubtype("npc")).not.toThrow();
  });

  it("rejects invalid subtype", () => {
    expect(() => validateCharacterSubtype("invalid")).toThrow(ValidationError);
  });
});

describe("S06 - Lifecycle Stage Validation", () => {
  it("accepts valid stages", () => {
    expect(() => validateCharacterLifecycleStage("childhood")).not.toThrow();
    expect(() => validateCharacterLifecycleStage("adulthood")).not.toThrow();
  });

  it("rejects invalid stage", () => {
    expect(() => validateCharacterLifecycleStage("unknown")).toThrow(ValidationError);
  });
});
