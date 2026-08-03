import type { GoalState, NeedType } from "@lumi/profiles";

export type GoalEvaluationStatus =
  | "active"
  | "completed"
  | "failed"
  | "abandoned";

export interface GoalEvaluation {
  goalId: string;
  needType: NeedType;
  description: string;
  priority: number;
  status: GoalEvaluationStatus;
  /** 0..1 composite pull: how strongly this goal attracts the NPC now. */
  pull: number;
}

export interface GoalEvaluationInput {
  goals: GoalState[];
  /** needType -> current pressure (from the need evaluator). */
  needPressures: Partial<Record<NeedType, number>>;
  timeSensitivity: number;
}

export interface GoalEvaluationResult {
  evaluations: GoalEvaluation[];
  /** Active goal with the highest pull, or null. */
  leadingGoalId: string | null;
}
