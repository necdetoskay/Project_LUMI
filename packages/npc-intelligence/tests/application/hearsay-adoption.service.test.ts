import { describe, expect, it } from "vitest";
import { HearsayAdoptionService } from "../../src/application/hearsay-adoption.service";
import { createRumor, HOP_DECAY_FACTOR } from "../../src/domain/rumor";

const HOUSEHOLD = "hh-1";

function makeRumor(confidence = 1, hops = 0) {
  const provenance = Array.from({ length: hops + 1 }, (_, i) => `npc-${i}`);
  return createRumor({
    householdId: HOUSEHOLD,
    factId: "f-1",
    claim: "the bridge is weakened",
    originNpcId: "npc-alpha",
    confidence,
    provenance,
  });
}

function makeIntent(
  overrides: {
    targetNpcId?: string;
    confidence?: number;
    provenance?: string[];
    hops?: number;
    belowFloor?: boolean;
  } = {},
) {
  const provenance = overrides.provenance ?? [
    "npc-alpha",
    ...(overrides.hops ? [`npc-relay-${overrides.hops}`] : []),
  ];
  return {
    targetNpcId: overrides.targetNpcId ?? "npc-beta",
    confidence: overrides.confidence ?? 0.8,
    provenance,
    hops: overrides.hops ?? provenance.length - 1,
    belowFloor: overrides.belowFloor ?? false,
  };
}

describe("HearsayAdoptionService", () => {
  const service = new HearsayAdoptionService();

  it("creates a hearsay belief with source hearsay", () => {
    const result = service.adopt({
      rumor: makeRumor(),
      intent: makeIntent(),
    });
    expect(result.belief.source).toBe("hearsay");
  });

  it("adopts the target NPC as the belief owner", () => {
    const result = service.adopt({
      rumor: makeRumor(),
      intent: makeIntent({ targetNpcId: "npc-charlie" }),
    });
    expect(result.belief.npcId).toBe("npc-charlie");
  });

  it("inherits the rumor household", () => {
    const result = service.adopt({
      rumor: makeRumor(),
      intent: makeIntent(),
    });
    expect(result.belief.householdId).toBe(HOUSEHOLD);
  });

  it("inherits the rumor factId and claim", () => {
    const rumor = makeRumor(1, 0);
    const result = service.adopt({
      rumor,
      intent: makeIntent(),
    });
    expect(result.belief.factId).toBe(rumor.factId);
    expect(result.belief.claim).toBe(rumor.claim);
  });

  it("uses the decayed confidence from the intent", () => {
    const rumor = makeRumor(1, 0);
    const result = service.adopt({
      rumor,
      intent: makeIntent({ confidence: 0.8 }),
    });
    expect(result.belief.confidence).toBeCloseTo(0.8, 5);
  });

  it("chain grows: provenance extends with each hop", () => {
    const rumor = makeRumor(1, 0);
    const result = service.adopt({
      rumor,
      intent: makeIntent({
        provenance: ["npc-alpha", "npc-beta"],
        hops: 1,
      }),
    });
    expect(result.belief.provenance).toEqual(["npc-alpha", "npc-beta"]);
    expect(result.belief.provenance.length).toBe(2);
  });

  it("chain grows: provenance extends over multiple hops", () => {
    const rumor = makeRumor(1, 0);
    const result = service.adopt({
      rumor,
      intent: makeIntent({
        provenance: ["npc-alpha", "npc-beta", "npc-gamma"],
        hops: 2,
      }),
    });
    expect(result.belief.provenance).toEqual([
      "npc-alpha",
      "npc-beta",
      "npc-gamma",
    ]);
    expect(result.belief.provenance.length).toBe(3);
  });

  it("confidence decays: adopted belief has lower confidence than source", () => {
    const rumor = makeRumor(1, 0);
    const result = service.adopt({
      rumor,
      intent: makeIntent({ confidence: 1 * HOP_DECAY_FACTOR }),
    });
    expect(result.belief.confidence).toBeLessThan(rumor.confidence);
  });

  it("sets status to active on adoption", () => {
    const result = service.adopt({
      rumor: makeRumor(),
      intent: makeIntent(),
    });
    expect(result.belief.status).toBe("active");
  });

  it("sets lastVerifiedAt to null on adoption", () => {
    const result = service.adopt({
      rumor: makeRumor(),
      intent: makeIntent(),
    });
    expect(result.belief.lastVerifiedAt).toBeNull();
  });

  it("inherits expiresAt from the rumor", () => {
    const expiresAt = new Date("2027-01-01");
    const rumor = createRumor({
      householdId: HOUSEHOLD,
      factId: "f-1",
      claim: "the bridge is weakened",
      originNpcId: "npc-alpha",
      confidence: 1,
      expiresAt,
    });
    const result = service.adopt({
      rumor,
      intent: makeIntent(),
    });
    expect(result.belief.expiresAt).toBe(expiresAt);
  });

  it("validates the adopted belief", () => {
    expect(() =>
      service.adopt({
        rumor: makeRumor(),
        intent: makeIntent({ targetNpcId: "" }),
      }),
    ).toThrow();
  });
});
