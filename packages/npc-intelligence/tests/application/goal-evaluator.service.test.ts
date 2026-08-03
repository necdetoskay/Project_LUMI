import { describe, expect, it } from "vitest";
import { GoalEvaluator } from "../../src/application/goal-evaluator.service";
import type { GoalState } from "@lumi/profiles";
import type { GoalEvaluationInput } from "../../src/domain";

function makeGoal(overrides: Partial<GoalState> = {}): GoalState {
  return {
    id: "goal-1",
    needType: "achievement",
    description: "Build the treehouse",
    priority: 0.6,
    status: "active",
    createdAt: new Date("2026-01-01T08:00:00Z"),
    completedAt: null,
    ...overrides,
  };
}

function buildInput(
  overrides: Partial<GoalEvaluationInput> = {},
): GoalEvaluationInput {
  return {
    goals: [makeGoal()],
    needPressures: { achievement: 0.7 },
    timeSensitivity: 0.2,
    ...overrides,
  };
}

describe("GoalEvaluator", () => {
  it("computes pull as a blend of priority, need pressure, and time sensitivity", () => {
    const service = new GoalEvaluator();
    const result = service.evaluate(buildInput());

    const goal = result.evaluations[0];
    expect(goal?.status).toBe("active");
    expect(goal?.pull).toBeCloseTo(0.6 * 0.5 + 0.7 * 0.4 + 0.2 * 0.1, 6);
    expect(result.leadingGoalId).toBe("goal-1");
  });

  it("gives no pull to non-active goals and never leads with them", () => {
    const service = new GoalEvaluator();
    const result = service.evaluate(
      buildInput({
        goals: [
          makeGoal({ id: "completed", status: "completed" }),
          makeGoal({ id: "failed", status: "failed" }),
        ],
      }),
    );

    expect(result.evaluations.every((e) => e.pull === 0)).toBe(true);
    expect(result.leadingGoalId).toBeNull();
  });

  it("picks the highest-pull active goal as leader", () => {
    const service = new GoalEvaluator();
    const result = service.evaluate(
      buildInput({
        goals: [
          makeGoal({ id: "goal-low", priority: 0.2 }),
          makeGoal({ id: "goal-high", priority: 0.9 }),
        ],
      }),
    );

    expect(result.leadingGoalId).toBe("goal-high");
  });

  it("breaks pull ties by priority then goal id", () => {
    const service = new GoalEvaluator();
    const result = service.evaluate(
      buildInput({
        goals: [
          makeGoal({ id: "goal-b", priority: 0.5 }),
          makeGoal({ id: "goal-a", priority: 0.5 }),
        ],
      }),
    );

    expect(result.leadingGoalId).toBe("goal-a");
  });
});
