import { describe, expect, it, vi } from "vitest";
import { QuestRewardApplicator } from "../../src/application/quest-reward-applicator.service";
import type { InventoryGrantPort } from "../../src/application/inventory-grant.port";

const HOUSEHOLD = "00000000-0000-4000-8000-000000000020";
const CHILD = "00000000-0000-4000-8000-000000000021";
const QUEST = "quest-1";

function makeIntent(overrides: Record<string, unknown> = {}) {
  return {
    intentType: "quest_reward_grant",
    payload: {
      questId: QUEST,
      householdId: HOUSEHOLD,
      worldId: "w",
      storySessionId: "s",
      childProfileId: CHILD,
      reward: { itemDefinitionKey: "golden-compass", quantity: 1 },
      evidenceRef: "evidence://q1",
      ...overrides,
    },
  };
}

function fakePort(): InventoryGrantPort {
  return {
    grant: vi.fn().mockResolvedValue({ granted: true }),
  };
}

describe("QuestRewardApplicator", () => {
  it("grants a reward through the port for a valid intent", async () => {
    const port = fakePort();
    const applicator = new QuestRewardApplicator(port);

    const result = await applicator.apply(makeIntent());

    expect(result.outcome).toBe("granted");
    expect(port.grant).toHaveBeenCalledWith({
      householdId: HOUSEHOLD,
      childProfileId: CHILD,
      reward: { itemDefinitionKey: "golden-compass", quantity: 1 },
      idempotencyKey: `quest-reward:${QUEST}`,
      sourceQuestId: QUEST,
    });
  });

  it("skips an intent with a mismatched type", async () => {
    const port = fakePort();
    const applicator = new QuestRewardApplicator(port);

    const result = await applicator.apply({ intentType: "npc_rumor_spread" });

    expect(result.outcome).toBe("skipped");
    expect(port.grant).not.toHaveBeenCalled();
  });

  it("skips an incomplete payload", async () => {
    const port = fakePort();
    const applicator = new QuestRewardApplicator(port);

    const result = await applicator.apply(makeIntent({ childProfileId: "" }));

    expect(result.outcome).toBe("skipped");
    expect(port.grant).not.toHaveBeenCalled();
  });

  it("skips when no reward is defined", async () => {
    const port = fakePort();
    const applicator = new QuestRewardApplicator(port);

    const result = await applicator.apply(makeIntent({ reward: null }));

    expect(result.outcome).toBe("skipped");
    expect(port.grant).not.toHaveBeenCalled();
  });

  it("skips an invalid reward definition", async () => {
    const port = fakePort();
    const applicator = new QuestRewardApplicator(port);

    const result = await applicator.apply(
      makeIntent({ reward: { itemDefinitionKey: "x", quantity: 0 } }),
    );

    expect(result.outcome).toBe("skipped");
    expect(port.grant).not.toHaveBeenCalled();
  });
});
