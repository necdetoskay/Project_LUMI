import { describe, expect, it } from "vitest";
import { StoryHookDeliveryApplicator } from "../../src/application/story-hook-delivery-applicator.service";

function makeDeliveryRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: "00000000-0000-4000-8000-000000000070",
    householdId: "00000000-0000-4000-8000-000000000020",
    worldId: "00000000-0000-4000-8000-000000000030",
    commitId: "00000000-0000-4000-8000-000000000060",
    idempotencyKey: "story-hook:opportunity-1",
    intentType: "story_hook_delivery",
    payload: {
      hookId: "00000000-0000-4000-8000-000000000080",
      opportunityId: "opportunity-1",
      hookType: "gift",
      sceneType: "choice",
      sourceNpcId: "00000000-0000-4000-8000-000000000025",
      storySessionId: "00000000-0000-4000-8000-000000000022",
    },
    evidenceRef: "hook://00000000-0000-4000-8000-000000000027",
    status: "pending",
    attemptCount: "0",
    lastError: null,
    appliedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("StoryHookDeliveryApplicator", () => {
  const applicator = new StoryHookDeliveryApplicator();

  it("applies a valid story_hook_delivery intent", async () => {
    const row = makeDeliveryRow() as never;
    const result = await applicator.apply(row);
    expect(result).toEqual({ writes: 1 });
  });

  it("ignores intents of a different type", async () => {
    const row = makeDeliveryRow({ intentType: "npc_rumor_spread" }) as never;
    const result = await applicator.apply(row);
    expect(result).toEqual({ writes: 0 });
  });

  it("skips an intent missing required payload fields", async () => {
    const row = makeDeliveryRow({
      payload: { hookId: "h-1", opportunityId: "opp-1" },
    }) as never;
    const result = await applicator.apply(row);
    expect(result).toEqual({ writes: 0 });
  });
});
