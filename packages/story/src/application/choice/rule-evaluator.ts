import { ValidationError } from "../../domain/errors";
import type {
  ChoiceAvailabilityRule,
  ChoiceRuleContext,
  RuleCondition,
  RuleOperator,
} from "../../domain/choice";

const EVALUATORS: Record<
  RuleOperator,
  (actual: unknown, expected: unknown) => boolean
> = {
  eq: (a, b) => a === b,
  neq: (a, b) => a !== b,
  gt: (a, b) => typeof a === "number" && typeof b === "number" && a > b,
  gte: (a, b) => typeof a === "number" && typeof b === "number" && a >= b,
  lt: (a, b) => typeof a === "number" && typeof b === "number" && a < b,
  lte: (a, b) => typeof a === "number" && typeof b === "number" && a <= b,
  in: (a, b) => Array.isArray(b) && b.includes(a),
  not_in: (a, b) => Array.isArray(b) && !b.includes(a),
  has_flag: (a, b) => {
    if (typeof a !== "boolean" || typeof b !== "boolean") return false;
    return a === true && b === true;
  },
};

function getValueAtPath(context: ChoiceRuleContext, path: string): unknown {
  switch (path) {
    case "sessionStatus":
      return context.sessionStatus;
    case "activeSceneId":
      return context.activeSceneId;
    case "storyVersionId":
      return context.storyVersionId;
    case "checkpointHash":
      return context.checkpointHash;
    default: {
      if (path.startsWith("flags.")) {
        const key = path.slice("flags.".length);
        return context.participantFlags[key] ?? false;
      }
      if (path.startsWith("scores.")) {
        const key = path.slice("scores.".length);
        return context.sessionScores[key] ?? 0;
      }
      if (path.startsWith("history.")) {
        const remainder = path.slice("history.".length);
        if (remainder === "count") return context.choiceHistory.length;
        if (remainder.startsWith("has:")) {
          const choicePointId = remainder.slice("has:".length);
          return context.choiceHistory.some(
            (h) => h.choicePointId === choicePointId,
          );
        }
        return undefined;
      }
      return undefined;
    }
  }
}

function evaluateCondition(
  condition: RuleCondition,
  context: ChoiceRuleContext,
): boolean {
  const actual = getValueAtPath(context, condition.path);
  const evaluator = EVALUATORS[condition.operator];
  if (!evaluator) {
    throw new ValidationError(
      "UNKNOWN_RULE_OPERATOR",
      `Unknown operator: ${condition.operator}`,
    );
  }
  return evaluator(actual, condition.value);
}

export function evaluateRule(
  rule: ChoiceAvailabilityRule,
  context: ChoiceRuleContext,
): boolean {
  if (!rule.conditions || rule.conditions.length === 0) {
    return true;
  }
  const matchPolicy = rule.matchPolicy ?? "all";
  const results = rule.conditions.map((c) => evaluateCondition(c, context));
  if (matchPolicy === "all") {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

export function evaluateOptionAvailability(
  optionAvailabilityRule: ChoiceAvailabilityRule | null,
  context: ChoiceRuleContext,
): { available: boolean; reason?: string | undefined } {
  if (!optionAvailabilityRule) {
    return { available: true };
  }
  const available = evaluateRule(optionAvailabilityRule, context);
  return {
    available,
    reason: available
      ? undefined
      : "Option availability conditions are not met",
  };
}
