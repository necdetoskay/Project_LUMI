import { describe, expect, it, vi } from "vitest";

import { DrizzleParentPolicySource } from "../../src/adapters/drizzle-parent-policy-source";
import type { ParentPolicyRepository } from "../../src/db/repositories/interfaces/parent-policy.repository";
import type { ParentalSettingRecord } from "../../src/db/schema/profile/parental-settings";

function sampleRecord(
  overrides: Partial<ParentalSettingRecord> = {},
): ParentalSettingRecord {
  return {
    householdId: "household-1",
    maxDailyStories: 3,
    contentBoundary: "strict",
    timeLimitMinutes: 60,
    requireParentApprovalForAi: false,
    allowImageGeneration: true,
    allowTts: true,
    safetyMetadata: {
      blockedTopics: ["fear", "loss"],
      customNotes: ["keep it gentle"],
    },
    ...overrides,
  };
}

function makeSource(record: ParentalSettingRecord | null) {
  const repository: ParentPolicyRepository = {
    findByHousehold: vi.fn(async () => record),
    upsert: vi.fn(),
    appendAuditEntry: vi.fn(),
    getAuditTrail: vi.fn(),
  };
  const source = new DrizzleParentPolicySource({
    repository,
    actorUserId: "parent-1",
  });
  return { repository, source };
}

describe("DrizzleParentPolicySource", () => {
  it("maps a stored record into a ParentPolicyItem", async () => {
    const { repository, source } = makeSource(sampleRecord());

    const result = await source.fetch({
      householdId: "household-1",
      childProfileId: "child-1",
      worldId: "world-1",
      generationIntent: "continue-story",
    });

    expect(repository.findByHousehold).toHaveBeenCalledWith(
      "household-1",
      "parent-1",
    );
    expect(result.sourceRelevance).toBe(1);
    expect(result.items).toHaveLength(1);

    const item = result.items[0];
    expect(item?.type).toBe("parent-policy");
    expect(item?.content).toMatchObject({
      householdId: "household-1",
      maxDailyStories: 3,
      contentBoundary: "strict",
      requireParentApprovalForAi: false,
      allowImageGeneration: true,
      allowTts: true,
      timeLimitMinutes: 60,
      forbiddenThemes: ["fear", "loss"],
    });
    expect(item?.text).toContain("contentBoundary: strict");
    expect(item?.text).toContain("forbiddenThemes: fear, loss");
  });

  it("returns empty result when no policy exists", async () => {
    const { repository, source } = makeSource(null);

    const result = await source.fetch({
      householdId: "household-1",
      childProfileId: "child-1",
      worldId: "world-1",
      generationIntent: "continue-story",
    });

    expect(repository.findByHousehold).toHaveBeenCalledWith(
      "household-1",
      "parent-1",
    );
    expect(result).toEqual({ sourceRelevance: 0, items: [] });
  });

  it("falls back to strict boundary for unknown content boundary values", async () => {
    const { source } = makeSource(
      sampleRecord({ contentBoundary: "unsafe-value" }),
    );

    const result = await source.fetch({
      householdId: "household-1",
      childProfileId: "child-1",
      worldId: "world-1",
      generationIntent: "continue-story",
    });

    expect(result.items[0]?.content.contentBoundary).toBe("strict");
  });

  it("defaults forbiddenThemes to empty when no blocked topics are set", async () => {
    const { source } = makeSource(sampleRecord({ safetyMetadata: {} }));

    const result = await source.fetch({
      householdId: "household-1",
      childProfileId: "child-1",
      worldId: "world-1",
      generationIntent: "continue-story",
    });

    expect(result.items[0]?.content.forbiddenThemes).toEqual([]);
  });
});
