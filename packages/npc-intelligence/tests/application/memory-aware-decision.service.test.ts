import { describe, expect, it, vi } from "vitest";
import { MemoryAwareDecisionService } from "../../src/application/memory-aware-decision.service";
import type {
  CandidateAction,
  CanonicalMemory,
  DecisionContextVector,
  UtilityWeightPolicy,
} from "../../src/domain";
import type { CanonicalMemoryPort } from "../../src/ports/canonical-memory.port";

const HOUSEHOLD = "11111111-1111-4111-8111-111111111111";
const WORLD = "22222222-2222-4222-8222-222222222222";
const PROFILE = "33333333-3333-4333-8333-333333333333";
const NPC = "44444444-4444-4444-8444-444444444444";
const NOW = new Date("2026-08-10T00:00:00.000Z");

const context: DecisionContextVector = {
  npcId: NPC,
  householdId: HOUSEHOLD,
  traits: {},
  emotions: {},
  influence: {
    emotional: 0,
    social: 0,
    cultural: 0,
    educational: 0,
    political: 0,
    environmental: 0,
    familial: 0,
    spiritual: 0,
    historical: 0,
  },
  relationships: [],
  needs: [],
  goals: [],
  timeSensitivity: 0,
  urgency: 0,
  contentHash: "context-hash",
};

const policy: UtilityWeightPolicy = {
  version: "s47-test",
  updatedAt: NOW,
  weights: {
    needSatisfaction: 0,
    emotionalComfort: 0,
    safety: 1,
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

function candidate(id: string, kind: string, safety: CandidateAction["safety"] = "safe"): CandidateAction {
  return {
    id,
    kind,
    description: id,
    requiredFactIds: [],
    targetCharacterId: null,
    needTypes: [],
    personalityFit: 0.5,
    safety,
  };
}

function memory(provenance: string[]): CanonicalMemory {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    householdId: HOUSEHOLD,
    worldId: WORLD,
    childProfileId: PROFILE,
    ownerType: "npc",
    ownerId: NPC,
    kind: "experience",
    summary: "Explicit evidence only.",
    salience: 1,
    confidence: 1,
    sourceType: "story_outcome",
    sourceId: "commit-1",
    effectKey: "effect-1",
    provenance,
    lifecycle: "durable",
    createdAt: NOW,
  };
}

function port(returned: CanonicalMemory[]): CanonicalMemoryPort {
  return {
    listRelevant: vi.fn().mockResolvedValue(returned),
    save: vi.fn(),
    reinforce: vi.fn(),
    reinforceForScene: vi.fn(),
    archive: vi.fn(),
  };
}

describe("MemoryAwareDecisionService", () => {
  it("uses bounded explicit memory evidence to break an otherwise equal decision", async () => {
    const service = new MemoryAwareDecisionService(
      port([memory(["decision:candidate:join-1:1"])])
    );

    const result = await service.decide({
      householdId: HOUSEHOLD,
      worldId: WORLD,
      childProfileId: PROFILE,
      npcId: NPC,
      candidates: [candidate("join-1", "socialize"), candidate("rest-1", "rest")],
      context,
      policy,
      seed: "same-seed",
      now: NOW,
    });

    expect(result.selection.selectedCandidateId).toBe("join-1");
    expect(result.scores.find((score) => score.candidateId === "join-1")).toEqual(
      expect.objectContaining({ baseTotal: 1, memoryDelta: 0.2, total: 1.2 }),
    );
    expect(result.usedMemoryIds).toEqual([
      "55555555-5555-4555-8555-555555555555",
    ]);
  });

  it("cannot use positive memory evidence to bypass a blocked candidate", async () => {
    const service = new MemoryAwareDecisionService(
      port([memory(["decision:candidate:blocked-1:1"])])
    );

    const result = await service.decide({
      householdId: HOUSEHOLD,
      worldId: WORLD,
      childProfileId: PROFILE,
      npcId: NPC,
      candidates: [candidate("blocked-1", "explore", "blocked"), candidate("safe-1", "rest")],
      context,
      policy,
      seed: "same-seed",
      now: NOW,
    });

    expect(result.selection.selectedCandidateId).toBe("safe-1");
    expect(result.selection.eliminations).toContainEqual({
      candidateId: "blocked-1",
      reason: "blocked by safety policy",
    });
  });
});
