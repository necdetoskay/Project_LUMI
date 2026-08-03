import { describe, expect, it } from "vitest";
import { DecisionContextBuilder } from "../../src/application/decision-context-builder.service";
import type { DecisionContextBuildInput } from "../../src/domain";

function buildInput(
  overrides: Partial<DecisionContextBuildInput> = {},
): DecisionContextBuildInput {
  return {
    npcId: "npc-1",
    householdId: "household-1",
    traits: { curiosity: 0.8 },
    emotions: { fear: 0.4 },
    influence: {
      emotional: 0.5,
      social: 0.6,
      cultural: 0.5,
      educational: 0.5,
      political: 0.5,
      environmental: 0.5,
      familial: 0.5,
      spiritual: 0.5,
      historical: 0.5,
    },
    relationships: [
      {
        targetCharacterId: "npc-2",
        trust: 0.7,
        affinity: 0.6,
        familiarity: 0.5,
        relationshipType: "friend",
      },
    ],
    needs: [
      {
        needType: "safety",
        current: 0.8,
        decay: 0.4,
        urgency: 0.88,
        source: "need_state",
      },
    ],
    goals: [
      {
        goalId: "goal-1",
        needType: "achievement",
        description: "Build",
        priority: 0.6,
        status: "active",
        pull: 0.6,
      },
    ],
    timeSensitivity: 0.2,
    urgency: 0.88,
    ...overrides,
  };
}

describe("DecisionContextBuilder", () => {
  it("builds a complete vector with a content hash", () => {
    const service = new DecisionContextBuilder();
    const vector = service.build(buildInput());

    expect(vector.npcId).toBe("npc-1");
    expect(vector.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces the same hash for the same state regardless of object key order", () => {
    const service = new DecisionContextBuilder();
    const a = buildInput({ traits: { curiosity: 0.8, courage: 0.2 } });
    const b = buildInput({ traits: { courage: 0.2, curiosity: 0.8 } });

    expect(service.build(a).contentHash).toBe(service.build(b).contentHash);
  });

  it("produces different hashes for different states", () => {
    const service = new DecisionContextBuilder();
    const a = buildInput({ timeSensitivity: 0.2 });
    const b = buildInput({ timeSensitivity: 0.8 });

    expect(service.build(a).contentHash).not.toBe(service.build(b).contentHash);
  });

  it("clamps normalized dimensions to 0..1", () => {
    const service = new DecisionContextBuilder();
    const vector = service.build(
      buildInput({ timeSensitivity: 1.5, urgency: -0.2 }),
    );

    expect(vector.timeSensitivity).toBe(1);
    expect(vector.urgency).toBe(0);
  });

  it("clones nested inputs so later mutation cannot change the vector", () => {
    const service = new DecisionContextBuilder();
    const input = buildInput();
    const vector = service.build(input);

    input.needs[0]!.current = 0.1;
    expect(vector.needs[0]?.current).toBe(0.8);
  });
});
