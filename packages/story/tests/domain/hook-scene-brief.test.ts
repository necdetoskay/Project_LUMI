import { describe, expect, it } from "vitest";
import { buildHookSceneBrief } from "../../src/domain/hook-scene-brief";
import type { StoryHookState, HookType } from "../../src/domain/story-types";

function makeHook(
  hookType: HookType,
  payload: Record<string, unknown>,
): StoryHookState {
  return {
    id: "hook-1",
    householdId: "household-1",
    childProfileId: "child-1",
    storySessionId: "session-1",
    worldId: "world-1",
    opportunityId: "opportunity-1",
    hookType,
    sourceNpcId: "npc-source",
    targetNpcId: null,
    payload,
    constraints: {},
    sceneType: "narrative",
    status: "pending",
    version: 1,
    createdAt: new Date(),
    consumedAt: null,
  };
}

describe("buildHookSceneBrief", () => {
  it("maps a rumor hook claim and fact id", () => {
    const brief = buildHookSceneBrief(
      makeHook("rumor", { claim: "moon is made of cheese", factId: "fact-1" }),
    );
    expect(brief.hookType).toBe("rumor");
    expect(brief.claim).toBe("moon is made of cheese");
    expect(brief.factId).toBe("fact-1");
    expect(brief.itemId).toBeNull();
  });

  it("maps a gift hook item id", () => {
    const brief = buildHookSceneBrief(
      makeHook("gift", { itemId: "golden-compass", transferable: true }),
    );
    expect(brief.itemId).toBe("golden-compass");
    expect(brief.claim).toBe("");
  });

  it("maps a warning hook condition id", () => {
    const brief = buildHookSceneBrief(
      makeHook("warning", { conditionId: "storm-warning" }),
    );
    expect(brief.conditionId).toBe("storm-warning");
  });

  it("maps a quest_seed hook fact id + claim", () => {
    const brief = buildHookSceneBrief(
      makeHook("quest_seed", { factId: "lost-letter", claim: "a lost letter" }),
    );
    expect(brief.factId).toBe("lost-letter");
    expect(brief.claim).toBe("a lost letter");
  });

  it("maps an invitation hook place claim via placeClaim", () => {
    const brief = buildHookSceneBrief(
      makeHook("invitation", { placeClaim: "the harbor festival" }),
    );
    expect(brief.placeClaim).toBe("the harbor festival");
  });

  it("degrades unknown payload fields into a bounded summary", () => {
    const brief = buildHookSceneBrief(
      makeHook("social_visit", {
        targetNpcId: "npc-2",
        extra: "x".repeat(5000),
        nested: { a: 1 },
      }),
    );
    expect(brief.payloadSummary).toContain("extra=");
    expect(brief.payloadSummary.length).toBeLessThan(1200);
  });

  it("handles empty payload without throwing", () => {
    const brief = buildHookSceneBrief(makeHook("information_share", {}));
    expect(brief.claim).toBe("");
    expect(brief.payloadSummary).toBe("");
  });
});
