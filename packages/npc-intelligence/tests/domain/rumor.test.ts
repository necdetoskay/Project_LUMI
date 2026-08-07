import { describe, expect, it } from "vitest";
import {
  createRumor,
  decayRumorForHop,
  HOP_DECAY_FACTOR,
  RUMOR_PROPAGATION_FLOOR,
} from "../../src/domain/rumor";
import { NpcIntelligenceError } from "../../src/domain/errors";

function makeRumor(confidence = 1, hops = 0) {
  const provenance = Array.from({ length: hops + 1 }, (_, i) => `npc-${i}`);
  return createRumor({
    householdId: "hh-1",
    factId: "f-1",
    claim: "the bridge is weakened",
    originNpcId: "npc-0",
    confidence,
    provenance,
  });
}

describe("Rumor", () => {
  it("creates a rumor with provenance and zero hops", () => {
    const r = makeRumor();
    expect(r.hops).toBe(0);
    expect(r.provenance).toEqual(["npc-0"]);
    expect(r.sourceEventId).toBeNull();
  });

  it("derives hops from provenance length", () => {
    const r = makeRumor(1, 2); // provenance = [npc-0, npc-1, npc-2]
    expect(r.hops).toBe(2);
  });

  it("rejects invalid confidence", () => {
    expect(() => makeRumor(1.5)).toThrowError("must be between 0 and 1");
  });

  it("rejects provenance over the max", () => {
    const provenance = Array.from({ length: 25 }, (_, i) => `npc-${i}`);
    expect(() =>
      createRumor({
        householdId: "hh-1",
        factId: "f-1",
        claim: "x",
        originNpcId: "npc-0",
        confidence: 1,
        provenance,
      }),
    ).toThrowError(NpcIntelligenceError);
  });

  it("decays confidence per hop deterministically", () => {
    const r = makeRumor(1, 0);
    const result = decayRumorForHop(r, "npc-1", 0);
    expect(result.confidence).toBeCloseTo(1 * HOP_DECAY_FACTOR, 5);
    expect(result.hops).toBe(1);
    expect(result.provenance).toEqual(["npc-0", "npc-1"]);
  });

  it("decays confidence per elapsed time", () => {
    const r = makeRumor(1, 0);
    const day = 24 * 60 * 60 * 1000;
    const result = decayRumorForHop(r, "npc-1", day);
    // hop decay (0.8) * time decay (0.9)
    expect(result.confidence).toBeCloseTo(0.8 * 0.9, 5);
  });

  it("confidence strictly decreases across hops", () => {
    let rumor = makeRumor(1, 0);
    const confidences: number[] = [rumor.confidence];
    for (let i = 1; i <= 3; i++) {
      const result = decayRumorForHop(rumor, `npc-${i}`, 0);
      confidences.push(result.confidence);
      rumor = { ...rumor, ...result, provenance: result.provenance };
    }
    for (let i = 1; i < confidences.length; i++) {
      expect(confidences[i]!).toBeLessThan(confidences[i - 1]!);
    }
  });

  it("flags a rumor below the propagation floor", () => {
    const r = makeRumor(0.2, 0);
    const result = decayRumorForHop(r, "npc-1", 0);
    expect(result.belowFloor).toBe(true);
    expect(result.confidence).toBeLessThan(RUMOR_PROPAGATION_FLOOR);
  });

  it("is deterministic for the same input", () => {
    const r = makeRumor(1, 0);
    const a = decayRumorForHop(r, "npc-1", 0);
    const b = decayRumorForHop(r, "npc-1", 0);
    expect(a.confidence).toBe(b.confidence);
    expect(a.provenance).toEqual(b.provenance);
  });
});
