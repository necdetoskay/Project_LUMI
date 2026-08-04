import { describe, expect, it } from "vitest";
import {
  evaluateRule,
  evaluateOptionAvailability,
} from "../../../src/application/choice/rule-evaluator";
import type {
  ChoiceRuleContext,
  ChoiceAvailabilityRule,
} from "../../../src/domain/choice";

function buildContext(
  overrides: Partial<ChoiceRuleContext> = {},
): ChoiceRuleContext {
  return {
    sessionStatus: "active",
    activeSceneId: "scene-1",
    storyVersionId: "version-1",
    participantFlags: { brave: true },
    sessionScores: { kindness: 5 },
    choiceHistory: [],
    checkpointHash: "hash-1",
    ...overrides,
  };
}

describe("evaluateRule", () => {
  const cases: Array<{
    name: string;
    rule: ChoiceAvailabilityRule;
    context: ChoiceRuleContext;
    expected: boolean;
  }> = [
    {
      name: "eq on session status",
      rule: {
        ruleId: "r1",
        version: 1,
        conditions: [
          { path: "sessionStatus", operator: "eq", value: "active" },
        ],
      },
      context: buildContext(),
      expected: true,
    },
    {
      name: "neq on session status",
      rule: {
        ruleId: "r2",
        version: 1,
        conditions: [
          { path: "sessionStatus", operator: "neq", value: "completed" },
        ],
      },
      context: buildContext(),
      expected: true,
    },
    {
      name: "gt on score",
      rule: {
        ruleId: "r3",
        version: 1,
        conditions: [{ path: "scores.kindness", operator: "gt", value: 3 }],
      },
      context: buildContext(),
      expected: true,
    },
    {
      name: "lte on score",
      rule: {
        ruleId: "r4",
        version: 1,
        conditions: [{ path: "scores.kindness", operator: "lte", value: 5 }],
      },
      context: buildContext(),
      expected: true,
    },
    {
      name: "has_flag on participant flag",
      rule: {
        ruleId: "r5",
        version: 1,
        conditions: [
          { path: "flags.brave", operator: "has_flag", value: true },
        ],
      },
      context: buildContext(),
      expected: true,
    },
    {
      name: "in operator",
      rule: {
        ruleId: "r6",
        version: 1,
        conditions: [
          {
            path: "sessionStatus",
            operator: "in",
            value: ["active", "paused"],
          },
        ],
      },
      context: buildContext(),
      expected: true,
    },
    {
      name: "all conditions must pass",
      rule: {
        ruleId: "r7",
        version: 1,
        matchPolicy: "all",
        conditions: [
          { path: "sessionStatus", operator: "eq", value: "active" },
          { path: "scores.kindness", operator: "gte", value: 5 },
        ],
      },
      context: buildContext(),
      expected: true,
    },
    {
      name: "any condition passes",
      rule: {
        ruleId: "r8",
        version: 1,
        matchPolicy: "any",
        conditions: [
          { path: "sessionStatus", operator: "eq", value: "completed" },
          { path: "scores.kindness", operator: "gte", value: 5 },
        ],
      },
      context: buildContext(),
      expected: true,
    },
    {
      name: "missing flag returns false",
      rule: {
        ruleId: "r9",
        version: 1,
        conditions: [{ path: "flags.wise", operator: "has_flag", value: true }],
      },
      context: buildContext(),
      expected: false,
    },
    {
      name: "history count check",
      rule: {
        ruleId: "r10",
        version: 1,
        conditions: [{ path: "history.count", operator: "eq", value: 0 }],
      },
      context: buildContext(),
      expected: true,
    },
  ];

  it.each(cases)("$name", ({ rule, context, expected }) => {
    expect(evaluateRule(rule, context)).toBe(expected);
  });
});

describe("evaluateOptionAvailability", () => {
  it("returns available when no rule", () => {
    const result = evaluateOptionAvailability(null, buildContext());
    expect(result.available).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns unavailable when rule fails", () => {
    const rule: ChoiceAvailabilityRule = {
      ruleId: "r",
      version: 1,
      conditions: [{ path: "flags.wise", operator: "has_flag", value: true }],
    };
    const result = evaluateOptionAvailability(rule, buildContext());
    expect(result.available).toBe(false);
    expect(result.reason).toBeDefined();
  });
});
