import { z } from "zod";

export const VALIDATION_KINDS = [
  "schema",
  "safety",
  "canon",
  "continuity",
] as const;
export type ValidationKind = (typeof VALIDATION_KINDS)[number];

export const VALIDATION_SEVERITIES = ["error", "warning"] as const;
export type ValidationSeverity = (typeof VALIDATION_SEVERITIES)[number];

export const REPAIR_ACTIONS = [
  "regenerate",
  "repair",
  "reject",
  "fallback_template",
] as const;
export type RepairAction = (typeof REPAIR_ACTIONS)[number];

export interface ValidationFinding {
  kind: ValidationKind;
  code: string;
  message: string;
  severity: ValidationSeverity;
  path?: string;
}

export const validationFindingSchema = z.object({
  kind: z.enum(VALIDATION_KINDS),
  code: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(VALIDATION_SEVERITIES),
  path: z.string().optional(),
});

export interface ValidationReport {
  valid: boolean;
  findings: ValidationFinding[];
}

export const validationReportSchema = z.object({
  valid: z.boolean(),
  findings: z.array(validationFindingSchema),
});

export interface RepairDecision {
  action: RepairAction;
  reason: string;
  attemptsUsed: number;
  maxAttempts: number;
}

export const repairDecisionSchema = z.object({
  action: z.enum(REPAIR_ACTIONS),
  reason: z.string().min(1),
  attemptsUsed: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
});
