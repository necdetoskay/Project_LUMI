import { ValidationError } from "../errors";

export const CHOICE_POINT_TYPES = ["single", "multiple", "timed", "hidden", "conditional"] as const;
export type ChoicePointType = (typeof CHOICE_POINT_TYPES)[number];

export const CHOICE_OPTION_STATUSES = ["available", "locked", "hidden", "disabled"] as const;
export type ChoiceOptionStatus = (typeof CHOICE_OPTION_STATUSES)[number];

export const RULE_OPERATORS = ["eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in", "has_flag"] as const;
export type RuleOperator = (typeof RULE_OPERATORS)[number];

export const CONSEQUENCE_TYPES = ["scene_transition", "state_update", "flag_set", "flag_remove", "score_delta", "outcome_candidate"] as const;
export type ConsequenceType = (typeof CONSEQUENCE_TYPES)[number];

export const OUTCOME_CANDIDATE_STATUSES = ["pending", "committed", "rejected", "superseded"] as const;
export type OutcomeCandidateStatus = (typeof OUTCOME_CANDIDATE_STATUSES)[number];

export interface RuleCondition {
  path: string;
  operator: RuleOperator;
  value: unknown;
}

export interface ChoiceAvailabilityRule {
  ruleId: string;
  version: number;
  conditions: RuleCondition[];
  matchPolicy?: "all" | "any";
}

export interface ChoiceConsequencePreview {
  consequenceType: ConsequenceType;
  targetKey?: string;
  previewText: string;
  magnitude?: number;
}

export interface ChoiceRuleContext {
  sessionStatus: string;
  activeSceneId: string;
  storyVersionId: string;
  participantFlags: Record<string, boolean>;
  sessionScores: Record<string, number>;
  choiceHistory: ReadonlyArray<{ choicePointId: string; optionId: string; committedAt: Date }>;
  checkpointHash: string;
}

export function assertKnownChoicePointType(value: string): asserts value is ChoicePointType {
  if (!(CHOICE_POINT_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_CHOICE_POINT_TYPE", `Invalid choice point type: ${value}`);
  }
}

export function assertKnownRuleOperator(value: string): asserts value is RuleOperator {
  if (!(RULE_OPERATORS as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_RULE_OPERATOR", `Invalid rule operator: ${value}`);
  }
}

export function assertKnownConsequenceType(value: string): asserts value is ConsequenceType {
  if (!(CONSEQUENCE_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_CONSEQUENCE_TYPE", `Invalid consequence type: ${value}`);
  }
}

export function assertKnownOutcomeCandidateStatus(value: string): asserts value is OutcomeCandidateStatus {
  if (!(OUTCOME_CANDIDATE_STATUSES as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_OUTCOME_CANDIDATE_STATUS", `Invalid outcome candidate status: ${value}`);
  }
}
