import { describe, expect, it } from "vitest";
import { MemoryAwareUtilityService } from "../../src/application/memory-aware-utility.service";
import type { DecisionMemoryEvidence, UtilityScore } from "../../src/domain";

function score(candidateId: string, total: number): UtilityScore {
  return {
    candidateId,
    total,
    policyVersion: "test-v1",
    reasons: ["base"],
    components: {
      needSatisfaction: 0,
      emotionalComfort: 0,
      safety: 0,
      goalAlignment: 0,
      relationshipImpact: 0,
      socialApproval: 0,
      curiosity: 0,
      personalityFit: 0,
      timeSensitivity: 0,
      resourceCost: 0,
      timeCost: 0,
    },
  };
}

const memory: DecisionMemoryEvidence = {
  memoryId: "memory-1",
  kind: "event",
  effectiveSalience: 1,
  confidence: 1,
  candidateAffinity: {
    help_friend: 1,
    walk_away: -1,
  },
};

describe("MemoryAwareUtilityService", () => {
  it("nudges only caller-supplied candidates within the hard memory bound", () => {
    const service = new MemoryAwareUtilityService();
    const result = service.apply(
      [score("help_friend", 0.5), score("walk_away", 0.5)],
      [memory],
    );

    expect(result).toEqual([
      expect.objectContaining({
        candidateId: "help_friend",
        baseTotal: 0.5,
        memoryDelta: 0.2,
        total: 0.7,
        memoryEvidenceIds: ["memory-1"],
      }),
      expect.objectContaining({
        candidateId: "walk_away",
        baseTotal: 0.5,
        memoryDelta: -0.2,
        total: 0.3,
        memoryEvidenceIds: ["memory-1"],
      }),
    ]);
  });

  it("cannot invent a candidate from memory affinity", () => {
    const service = new MemoryAwareUtilityService();
    const result = service.apply([score("help_friend", 0.5)], [
      {
        ...memory,
        candidateAffinity: { forbidden_action: 1 },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        candidateId: "help_friend",
        memoryDelta: 0,
        total: 0.5,
      }),
    );
  });

  it("is deterministic for identical scores and evidence", () => {
    const service = new MemoryAwareUtilityService();
    const scores = [score("help_friend", 0.51), score("walk_away", 0.49)];

    expect(service.apply(scores, [memory])).toEqual(service.apply(scores, [memory]));
  });
});
