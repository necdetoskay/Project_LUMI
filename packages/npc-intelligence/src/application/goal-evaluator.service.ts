import type { NeedType } from "@lumi/profiles";

import type {
  GoalEvaluation,
  GoalEvaluationInput,
  GoalEvaluationResult,
} from "../domain";
import { clamp01 } from "../domain/validation";

/** Weight of the goal's base priority in its pull score. */
export const GOAL_PRIORITY_WEIGHT = 0.5;
/** Weight of matching need pressure in the pull score. */
export const GOAL_NEED_WEIGHT = 0.4;
/** Weight of current time sensitivity in the pull score. */
export const GOAL_TIME_WEIGHT = 0.1;

/**
 * Evaluates which goals attract an NPC right now.
 *
 * Rules:
 * - only active goals produce pull;
 * - pull blends base priority, matching need pressure, and time sensitivity;
 * - the leading goal is the active goal with the highest pull, using priority
 *   then goal id as deterministic tie-breakers.
 */
export class GoalEvaluator {
  evaluate(input: GoalEvaluationInput): GoalEvaluationResult {
    const evaluations: GoalEvaluation[] = input.goals.map((goal) => {
      if (goal.status !== "active") {
        return {
          goalId: goal.id,
          needType: goal.needType,
          description: goal.description,
          priority: goal.priority,
          status: goal.status,
          pull: 0,
        };
      }
      const needPressure = input.needPressures[goal.needType] ?? 0;
      const pull = clamp01(
        goal.priority * GOAL_PRIORITY_WEIGHT +
          clamp01(needPressure) * GOAL_NEED_WEIGHT +
          clamp01(input.timeSensitivity) * GOAL_TIME_WEIGHT,
      );
      return {
        goalId: goal.id,
        needType: goal.needType,
        description: goal.description,
        priority: goal.priority,
        status: "active",
        pull,
      };
    });

    const active = evaluations.filter((e) => e.status === "active");
    const sorted = [...active].sort(
      (a, b) =>
        b.pull - a.pull ||
        b.priority - a.priority ||
        a.goalId.localeCompare(b.goalId),
    );

    return {
      evaluations,
      leadingGoalId: sorted[0]?.goalId ?? null,
    };
  }
}

/** Extracts a need-type -> pressure lookup from need evaluations. */
export function toNeedPressureLookup(
  pressures: ReadonlyArray<{ needType: NeedType; urgency: number }>,
): Partial<Record<NeedType, number>> {
  const lookup: Partial<Record<NeedType, number>> = {};
  for (const pressure of pressures) {
    lookup[pressure.needType] = pressure.urgency;
  }
  return lookup;
}
