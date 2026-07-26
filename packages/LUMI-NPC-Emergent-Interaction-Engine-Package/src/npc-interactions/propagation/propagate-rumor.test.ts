import { describe, expect, it } from "vitest";
import { propagateRumor } from "./propagate-rumor";

describe("rumor propagation", () => {
  it("reduces reliability under distortion", () => {
    const result = propagateRumor({
      rumorId: "r1",
      sourceCharacterId: "a",
      receiverCharacterId: "b",
      sourceReliability: 0.9,
      relationshipTrust: 0.3,
      distortionRisk: 0.8,
    });

    expect(
      result.receivedReliability,
    ).toBeLessThan(0.9);
  });
});
