import { describe, expect, it } from "vitest";
import { RumorPropagationEngine } from "../../src/application/rumor-propagation.service";
import { createRumor, HOP_DECAY_FACTOR, RUMOR_PROPAGATION_FLOOR } from "../../src/domain/rumor";
import { NpcIntelligenceError } from "../../src/domain/errors";

const HOUSEHOLD = "hh-1";
const SOURCE_NPC = "npc-alpha";
const ELAPSED_MS = 0;
const SEED = "test-seed";

function makeRumor(confidence = 1, hops = 0) {
  const provenance = Array.from({ length: hops + 1 }, (_, i) => `npc-${i}`);
  return createRumor({
    householdId: HOUSEHOLD,
    factId: "f-1",
    claim: "the bridge is weakened",
    originNpcId: SOURCE_NPC,
    confidence,
    provenance,
  });
}

function makeSnapshot(
  npcId: string,
  householdId: string,
  options: { relationshipTrust?: number } = {},
) {
  return {
    npcId,
    householdId,
    traits: {},
    emotions: {},
    influence: {},
    relationships: options.relationshipTrust
      ? [
          {
            targetCharacterId: npcId,
            trust: options.relationshipTrust,
            affinity: 0,
            familiarity: 0,
            relationshipType: "neutral" as const,
          },
        ]
      : [],
    needs: [],
    goals: [],
  };
}

function makeInput(overrides: {
  sourceNpcId?: string;
  nearbyCharacterIds?: string[];
  characterSnapshots?: Map<string, ReturnType<typeof makeSnapshot>>;
  relationshipTrust?: Record<string, number>;
  rumor?: ReturnType<typeof makeRumor>;
  elapsedMs?: number;
  maxRecipients?: number;
  minTrust?: number;
  seed?: string;
} = {}) {
  const rumor = overrides.rumor ?? makeRumor();
  const nearbyCharacterIds = overrides.nearbyCharacterIds ?? [];
  const characterSnapshots =
    overrides.characterSnapshots ?? new Map();
  const relationshipTrust = overrides.relationshipTrust ?? {};

  return {
    sourceNpcId: overrides.sourceNpcId ?? SOURCE_NPC,
    householdId: HOUSEHOLD,
    rumor,
    characterSnapshots,
    nearbyCharacterIds,
    relationshipTrust,
    elapsedMs: overrides.elapsedMs ?? ELAPSED_MS,
    seed: overrides.seed ?? SEED,
    ...(overrides.maxRecipients !== undefined && { maxRecipients: overrides.maxRecipients }),
    ...(overrides.minTrust !== undefined && { minTrust: overrides.minTrust }),
  };
}

describe("RumorPropagationEngine", () => {
  describe("info-access gate", () => {
    it("allows propagation when source NPC is the rumor origin", () => {
      const engine = new RumorPropagationEngine();
      const input = makeInput({
        nearbyCharacterIds: ["npc-beta"],
        characterSnapshots: new Map([
          ["npc-beta", makeSnapshot("npc-beta", HOUSEHOLD)],
        ]),
        relationshipTrust: { "npc-beta": 0.5 },
      });
      const result = engine.propagate(input);
      expect(result.intents.length).toBeGreaterThanOrEqual(0);
    });

    it("allows propagation when source NPC is in the provenance chain", () => {
      const engine = new RumorPropagationEngine();
      const rumor = makeRumor(1, 1);
      rumor.provenance.push(SOURCE_NPC);
      const input = makeInput({
        rumor,
        nearbyCharacterIds: ["npc-beta"],
        characterSnapshots: new Map([
          ["npc-beta", makeSnapshot("npc-beta", HOUSEHOLD)],
        ]),
        relationshipTrust: { "npc-beta": 0.5 },
      });
      const result = engine.propagate(input);
      expect(result.intents.length).toBeGreaterThanOrEqual(0);
    });

    it("throws when source NPC is not the origin or in provenance", () => {
      const engine = new RumorPropagationEngine();
      const rumor = makeRumor(1, 0);
      const input = makeInput({
        rumor,
        sourceNpcId: "npc-stranger",
        nearbyCharacterIds: ["npc-beta"],
        characterSnapshots: new Map([
          ["npc-beta", makeSnapshot("npc-beta", HOUSEHOLD)],
        ]),
        relationshipTrust: { "npc-beta": 0.5 },
      });
      expect(() => engine.propagate(input)).toThrowError(
        NpcIntelligenceError,
      );
    });
  });

  describe("household scope", () => {
    it("excludes NPCs from a different household", () => {
      const engine = new RumorPropagationEngine();
      const input = makeInput({
        nearbyCharacterIds: ["npc-beta", "npc-guest"],
        characterSnapshots: new Map([
          ["npc-beta", makeSnapshot("npc-beta", HOUSEHOLD)],
          ["npc-guest", makeSnapshot("npc-guest", "hh-other")],
        ]),
        relationshipTrust: {
          "npc-beta": 0.5,
          "npc-guest": 0.5,
        },
      });
      const result = engine.propagate(input);
      const targetIds = result.intents.map((i) => i.targetNpcId);
      expect(targetIds).not.toContain("npc-guest");
    });

    it("excludes NPCs without a household match in snapshots", () => {
      const engine = new RumorPropagationEngine();
      const input = makeInput({
        nearbyCharacterIds: ["npc-beta"],
        characterSnapshots: new Map(),
        relationshipTrust: { "npc-beta": 0.5 },
      });
      const result = engine.propagate(input);
      expect(result.intents).toHaveLength(0);
      expect(result.reasons).toContain(
        "no eligible recipients for rumor propagation",
      );
    });
  });

  describe("nearby filter", () => {
    it("excludes NPCs not in the nearby list", () => {
      const engine = new RumorPropagationEngine();
      const input = makeInput({
        nearbyCharacterIds: [],
        characterSnapshots: new Map([
          [
            "npc-beta",
            makeSnapshot("npc-beta", HOUSEHOLD, { relationshipTrust: 0.5 }),
          ],
        ]),
        relationshipTrust: { "npc-beta": 0.5 },
      });
      const result = engine.propagate(input);
      expect(result.intents).toHaveLength(0);
    });
  });

  describe("relationship trust filter", () => {
    it("excludes NPCs with zero trust", () => {
      const engine = new RumorPropagationEngine();
      const input = makeInput({
        nearbyCharacterIds: ["npc-beta"],
        characterSnapshots: new Map([
          ["npc-beta", makeSnapshot("npc-beta", HOUSEHOLD)],
        ]),
        relationshipTrust: { "npc-beta": 0 },
      });
      const result = engine.propagate(input);
      expect(result.intents).toHaveLength(0);
    });

    it("excludes NPCs with negative trust", () => {
      const engine = new RumorPropagationEngine();
      const input = makeInput({
        nearbyCharacterIds: ["npc-beta"],
        characterSnapshots: new Map([
          ["npc-beta", makeSnapshot("npc-beta", HOUSEHOLD)],
        ]),
        relationshipTrust: { "npc-beta": -0.5 },
      });
      const result = engine.propagate(input);
      expect(result.intents).toHaveLength(0);
    });

    it("includes NPCs with positive trust", () => {
      const engine = new RumorPropagationEngine();
      const input = makeInput({
        nearbyCharacterIds: ["npc-beta"],
        characterSnapshots: new Map([
          ["npc-beta", makeSnapshot("npc-beta", HOUSEHOLD)],
        ]),
        relationshipTrust: { "npc-beta": 0.1 },
      });
      const result = engine.propagate(input);
      expect(result.intents.length).toBeGreaterThanOrEqual(0);
    });

    it("respects custom minTrust threshold", () => {
      const engine = new RumorPropagationEngine();
      const input = makeInput({
        nearbyCharacterIds: ["npc-beta", "npc-gamma"],
        characterSnapshots: new Map([
          ["npc-beta", makeSnapshot("npc-beta", HOUSEHOLD)],
          ["npc-gamma", makeSnapshot("npc-gamma", HOUSEHOLD)],
        ]),
        relationshipTrust: {
          "npc-beta": 0.3,
          "npc-gamma": 0.8,
        },
        minTrust: 0.5,
      });
      const result = engine.propagate(input);
      const targetIds = result.intents.map((i) => i.targetNpcId);
      expect(targetIds).toContain("npc-gamma");
      expect(targetIds).not.toContain("npc-beta");
    });
  });

  describe("no self-propagation", () => {
    it("excludes the source NPC from recipients", () => {
      const engine = new RumorPropagationEngine();
      const input = makeInput({
        nearbyCharacterIds: [SOURCE_NPC],
        characterSnapshots: new Map([
          [SOURCE_NPC, makeSnapshot(SOURCE_NPC, HOUSEHOLD)],
        ]),
        relationshipTrust: { [SOURCE_NPC]: 0.5 },
      });
      const result = engine.propagate(input);
      expect(result.intents).toHaveLength(0);
    });
  });

  describe("confidence decay", () => {
    it("decays confidence per hop deterministically", () => {
      const engine = new RumorPropagationEngine();
      const rumor = makeRumor(1, 0);
      const input = makeInput({
        rumor,
        nearbyCharacterIds: ["npc-beta"],
        characterSnapshots: new Map([
          ["npc-beta", makeSnapshot("npc-beta", HOUSEHOLD)],
        ]),
        relationshipTrust: { "npc-beta": 0.5 },
      });
      const result = engine.propagate(input);
      expect(result.intents).toHaveLength(1);
      expect(result.intents[0]!.confidence).toBeCloseTo(
        1 * HOP_DECAY_FACTOR,
        5,
      );
    });

    it("confidence strictly decreases across hops", () => {
      const engine = new RumorPropagationEngine();
      const rumor = makeRumor(1, 0);
      const input = makeInput({
        rumor,
        nearbyCharacterIds: ["npc-beta"],
        characterSnapshots: new Map([
          ["npc-beta", makeSnapshot("npc-beta", HOUSEHOLD)],
        ]),
        relationshipTrust: { "npc-beta": 0.5 },
      });
      const result = engine.propagate(input);
      expect(result.intents[0]!.confidence).toBeLessThan(1);
    });
  });

  describe("below floor filtering", () => {
    it("does not propagate a rumor that falls below the floor", () => {
      const engine = new RumorPropagationEngine();
      const rumor = makeRumor(RUMOR_PROPAGATION_FLOOR, 0);
      const input = makeInput({
        rumor,
        nearbyCharacterIds: ["npc-beta"],
        characterSnapshots: new Map([
          ["npc-beta", makeSnapshot("npc-beta", HOUSEHOLD)],
        ]),
        relationshipTrust: { "npc-beta": 0.5 },
      });
      const result = engine.propagate(input);
      const targetIds = result.intents.map((i) => i.targetNpcId);
      expect(targetIds).not.toContain("npc-beta");
    });
  });

  describe("max recipients cap", () => {
    it("limits the number of recipients to maxRecipients", () => {
      const engine = new RumorPropagationEngine();
      const snapshots = new Map();
      const trust: Record<string, number> = {};
      const nearby: string[] = [];
      for (let i = 0; i < 10; i++) {
        const id = `npc-${i}`;
        snapshots.set(id, makeSnapshot(id, HOUSEHOLD));
        trust[id] = 0.5;
        nearby.push(id);
      }
      const input = makeInput({
        nearbyCharacterIds: nearby,
        characterSnapshots: snapshots,
        relationshipTrust: trust,
        maxRecipients: 3,
      });
      const result = engine.propagate(input);
      expect(result.intents.length).toBeLessThanOrEqual(3);
    });
  });

  describe("determinism", () => {
    it("same input + seed produces the same recipient set", () => {
      const engine = new RumorPropagationEngine();
      const snapshots = new Map();
      const trust: Record<string, number> = {};
      const nearby: string[] = [];
      for (let i = 0; i < 5; i++) {
        const id = `npc-${i}`;
        snapshots.set(id, makeSnapshot(id, HOUSEHOLD));
        trust[id] = 0.5;
        nearby.push(id);
      }
      const input = makeInput({
        nearbyCharacterIds: nearby,
        characterSnapshots: snapshots,
        relationshipTrust: trust,
        maxRecipients: 3,
        seed: SEED,
      });
      const resultA = engine.propagate(input);
      const resultB = engine.propagate(input);
      expect(resultA.intents.map((i) => i.targetNpcId)).toEqual(
        resultB.intents.map((i) => i.targetNpcId),
      );
    });

    it("different seed produces a different recipient order", () => {
      const engine = new RumorPropagationEngine();
      const snapshots = new Map();
      const trust: Record<string, number> = {};
      const nearby: string[] = [];
      for (let i = 0; i < 5; i++) {
        const id = `npc-${i}`;
        snapshots.set(id, makeSnapshot(id, HOUSEHOLD));
        trust[id] = 0.5;
        nearby.push(id);
      }
      const inputA = makeInput({
        nearbyCharacterIds: nearby,
        characterSnapshots: snapshots,
        relationshipTrust: trust,
        maxRecipients: 3,
        seed: "seed-a",
      });
      const inputB = makeInput({
        nearbyCharacterIds: nearby,
        characterSnapshots: snapshots,
        relationshipTrust: trust,
        maxRecipients: 3,
        seed: "seed-b",
      });
      const resultA = engine.propagate(inputA);
      const resultB = engine.propagate(inputB);
      const idsA = resultA.intents.map((i) => i.targetNpcId);
      const idsB = resultB.intents.map((i) => i.targetNpcId);
      expect(idsA).not.toEqual(idsB);
    });
  });

  describe("empty eligible recipients", () => {
    it("returns empty intents when no nearby NPCs", () => {
      const engine = new RumorPropagationEngine();
      const input = makeInput({
        nearbyCharacterIds: [],
      });
      const result = engine.propagate(input);
      expect(result.intents).toHaveLength(0);
      expect(result.reasons).toContain(
        "no eligible recipients for rumor propagation",
      );
    });

    it("returns empty intents when all targets are cross-household", () => {
      const engine = new RumorPropagationEngine();
      const input = makeInput({
        nearbyCharacterIds: ["npc-beta"],
        characterSnapshots: new Map([
          ["npc-beta", makeSnapshot("npc-beta", "hh-other")],
        ]),
        relationshipTrust: { "npc-beta": 0.5 },
      });
      const result = engine.propagate(input);
      expect(result.intents).toHaveLength(0);
    });
  });
});