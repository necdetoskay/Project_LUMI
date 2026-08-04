export const SAFETY_FINDING_CODES = [
  "CHILD_SAFETY-001",
  "CHILD_SAFETY-002",
  "CONTENT-001",
  "CONTENT-002",
  "PRIVACY-001",
] as const;
export type SafetyFindingCode = (typeof SAFETY_FINDING_CODES)[number];

export const CONSISTENCY_FINDING_CODES = [
  "CONSISTENCY-001",
  "CONSISTENCY-002",
  "CONSISTENCY-003",
] as const;
export type ConsistencyFindingCode = (typeof CONSISTENCY_FINDING_CODES)[number];

export interface SafetyFinding {
  code: SafetyFindingCode;
  message: string;
  severity: "error" | "warn";
}

export interface ConsistencyFinding {
  code: ConsistencyFindingCode;
  message: string;
  severity: "error" | "warn";
}
