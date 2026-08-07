import { describe, expect, it, vi } from "vitest";
import { QuestSeedAutomationApplicator } from "../../src/application/quest-seed-automation-applicator.service";

const HOUSEHOLD = "00000000-0000-4000-8000-000000000020";
const WORLD = "00000000-0000-4000-8000-000000000030";
const SESSION = "00000000-0000-4000-8000-000000000040";
const HOOK = "hook-1";

function makeIntent(overrides: Record<string, unknown> = {}) {
  return {
    intentType: "quest_seed_automation",
    payload: {
      hookId: HOOK,
      opportunityId: "opp-1",
      storySessionId: SESSION,
      worldId: WORLD,
      householdId: HOUSEHOLD,
      factId: "lost-letter",
      sourceNpcId: "npc-1",
      ...overrides,
    },
  };
}

describe("QuestSeedAutomationApplicator", () => {
  it("applies a valid quest_seed_automation intent", async () => {
    const automate = vi.fn().mockResolvedValue({
      quest: { id: "quest-1", status: "active" },
      created: true,
    });
    const applicator = new QuestSeedAutomationApplicator(automate);

    const result = await applicator.apply(makeIntent());

    expect(result.outcome).toBe("applied");
    expect(automate).toHaveBeenCalledWith({
      householdId: HOUSEHOLD,
      worldId: WORLD,
      storySessionId: SESSION,
      factId: "lost-letter",
      sourceHookId: HOOK,
    });
  });

  it("skips an intent with a mismatched type", async () => {
    const automate = vi.fn();
    const applicator = new QuestSeedAutomationApplicator(automate);

    const result = await applicator.apply({ intentType: "npc_rumor_spread" });

    expect(result.outcome).toBe("skipped");
    expect(automate).not.toHaveBeenCalled();
  });

  it("skips an incomplete payload without calling automate", async () => {
    const automate = vi.fn();
    const applicator = new QuestSeedAutomationApplicator(automate);

    const result = await applicator.apply(
      makeIntent({ householdId: "", worldId: "" }),
    );

    expect(result.outcome).toBe("skipped");
    expect(automate).not.toHaveBeenCalled();
  });

  it("propagates automate errors to the caller", async () => {
    const automate = vi.fn().mockRejectedValue(new Error("boom"));
    const applicator = new QuestSeedAutomationApplicator(automate);

    await expect(applicator.apply(makeIntent())).rejects.toThrow("boom");
  });
});
