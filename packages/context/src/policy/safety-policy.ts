export type SafetyContentBoundary = "strict" | "moderate" | "open";

export interface SafetyBaseline {
  contentBoundary: SafetyContentBoundary;
  requireParentApprovalForAi: boolean;
  forbiddenThemes: string[];
  maxDailyStoriesCap: number;
  allowImageGeneration: boolean;
  allowTts: boolean;
}

export const BOUNDARY_RANK: Record<SafetyContentBoundary, number> = {
  strict: 3,
  moderate: 2,
  open: 1,
};

export const DEFAULT_SAFETY_BASELINE: SafetyBaseline = {
  contentBoundary: "strict",
  requireParentApprovalForAi: true,
  forbiddenThemes: ["violence", "substance_abuse", "sexual_content", "profanity"],
  maxDailyStoriesCap: 50,
  allowImageGeneration: false,
  allowTts: true,
};

export function isBoundaryAtLeastAsRestrictive(
  parent: SafetyContentBoundary,
  baseline: SafetyContentBoundary,
): boolean {
  return BOUNDARY_RANK[parent] >= BOUNDARY_RANK[baseline];
}

export function stricterBoundary(
  a: SafetyContentBoundary,
  b: SafetyContentBoundary,
): SafetyContentBoundary {
  return BOUNDARY_RANK[a] >= BOUNDARY_RANK[b] ? a : b;
}

export function getSafetyPrecedence(): string[] {
  return [
    "contentBoundary",
    "requireParentApprovalForAi",
    "forbiddenThemes",
    "maxDailyStoriesCap",
    "allowImageGeneration",
    "allowTts",
  ];
}
