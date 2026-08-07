import { describe, expect, it } from "vitest";
import { planQuestReward } from "../../src/domain/quest-reward-planner";
import type { QuestState } from "../../src/domain/world-types";

function makeQuest(overrides: Partial<QuestState> = {}): QuestState {
  return {
    id: "quest-1",
    householdId: "h",
    worldId: "w",
    storySessionId: "s",
    title: "Quest",
    summary: "summary",
    objectives: [
      {
        index: 0,
        title: "A",
        status: "completed",
        evidenceRef: "e",
        completedAt: new Date(),
      },
    ],
    reward: { itemDefinitionKey: "golden-compass", quantity: 1 },
    status: "completed",
    version: 3,
    evidenceRef: "e",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("planQuestReward", () => {
  it("plans a reward for a completed quest with an authored reward", () => {
    const intent = planQuestReward(makeQuest());
    expect(intent).not.toBeNull();
    expect(intent!.questId).toBe("quest-1");
    expect(intent!.reward).toEqual({
      itemDefinitionKey: "golden-compass",
      quantity: 1,
    });
  });

  it("returns null for an active quest", () => {
    expect(planQuestReward(makeQuest({ status: "active" }))).toBeNull();
  });

  it("returns null for a completed quest without a reward", () => {
    expect(planQuestReward(makeQuest({ reward: null }))).toBeNull();
  });

  it("returns null for an inactive quest with a reward", () => {
    expect(planQuestReward(makeQuest({ status: "inactive" }))).toBeNull();
  });

  it("returns a defensive reward copy", () => {
    const intent = planQuestReward(makeQuest());
    intent!.reward.quantity = 99;
    expect(planQuestReward(makeQuest())!.reward.quantity).toBe(1);
  });
});
