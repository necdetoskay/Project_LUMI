import { describe, it, expect } from "vitest";
import { ParentPolicy } from "../../src/domain/parent-policy";
import { ValidationError } from "../../src/domain/errors";

describe("ParentPolicy", () => {
  const householdId = crypto.randomUUID();

  it("creates with defaults", () => {
    const policy = ParentPolicy.create({ householdId });
    const state = policy.getState();
    expect(state.maxDailyStories).toBe(3);
    expect(state.contentBoundary).toBe("strict");
    expect(state.requireParentApprovalForAi).toBe(false);
    expect(state.allowImageGeneration).toBe(true);
    expect(state.allowTts).toBe(true);
    expect(state.timeLimitMinutes).toBeNull();
  });

  it("creates with custom values", () => {
    const policy = ParentPolicy.create({
      householdId,
      maxDailyStories: 10,
      contentBoundary: "moderate",
      timeLimitMinutes: 60,
    });
    expect(policy.getState().maxDailyStories).toBe(10);
    expect(policy.getState().contentBoundary).toBe("moderate");
    expect(policy.getState().timeLimitMinutes).toBe(60);
  });

  it("rejects invalid daily limit (negative)", () => {
    expect(() =>
      ParentPolicy.create({ householdId, maxDailyStories: -1 }),
    ).toThrow(ValidationError);
  });

  it("rejects invalid daily limit (over 50)", () => {
    expect(() =>
      ParentPolicy.create({ householdId, maxDailyStories: 51 }),
    ).toThrow(ValidationError);
  });

  it("rejects invalid content boundary", () => {
    expect(() =>
      ParentPolicy.create({ householdId, contentBoundary: "extreme" as any }),
    ).toThrow(ValidationError);
  });

  it("rejects invalid time limit", () => {
    expect(() =>
      ParentPolicy.create({ householdId, timeLimitMinutes: -5 }),
    ).toThrow(ValidationError);
  });

  it("updates policy values", () => {
    const policy = ParentPolicy.create({ householdId });
    policy.update({
      maxDailyStories: 5,
      contentBoundary: "open",
      requireParentApprovalForAi: true,
    });
    const state = policy.getState();
    expect(state.maxDailyStories).toBe(5);
    expect(state.contentBoundary).toBe("open");
    expect(state.requireParentApprovalForAi).toBe(true);
  });

  it("validates activity duration", () => {
    const policy = ParentPolicy.create({
      householdId,
      timeLimitMinutes: 30,
    });
    expect(policy.validateActivityDuration(15)).toBe(true);
    expect(policy.validateActivityDuration(30)).toBe(true);
    expect(policy.validateActivityDuration(31)).toBe(false);
  });

  it("allows unlimited activity when no time limit", () => {
    const policy = ParentPolicy.create({ householdId });
    expect(policy.validateActivityDuration(999)).toBe(true);
  });

  it("records audit trail", () => {
    const policy = ParentPolicy.create({ householdId });
    const before = { ...policy.getState() };
    policy.update({ maxDailyStories: 10 });
    const after = { ...policy.getState() };

    policy.recordAudit({
      id: crypto.randomUUID(),
      actorId: crypto.randomUUID(),
      action: "policy.updated",
      beforeState: { maxDailyStories: before.maxDailyStories },
      afterState: { maxDailyStories: after.maxDailyStories },
    });

    const trail = policy.getAuditTrail();
    expect(trail).toHaveLength(1);
    expect(trail[0]!.action).toBe("policy.updated");
  });

  it("checks guardian approval requirement", () => {
    const withApproval = ParentPolicy.create({
      householdId,
      requireParentApprovalForAi: true,
    });
    expect(withApproval.canGuardianExceed()).toBe(true);

    const withoutApproval = ParentPolicy.create({
      householdId,
      requireParentApprovalForAi: false,
    });
    expect(withoutApproval.canGuardianExceed()).toBe(false);
  });
});
