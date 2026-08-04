import type { ParentPolicyItem } from "../ports/context-sources";
import {
  BOUNDARY_RANK,
  type SafetyBaseline,
  type SafetyContentBoundary,
  stricterBoundary,
} from "./safety-policy";

export interface PolicyViolation {
  code: string;
  field: string;
  message: string;
}

export interface PolicyGuardResult {
  allowed: boolean;
  violations: PolicyViolation[];
  sanitizedPolicy: ParentPolicyItem;
}

export function ensureParentPolicyDoesNotLoosenSafety(
  parentPolicy: ParentPolicyItem,
  baseline: SafetyBaseline,
): PolicyGuardResult {
  const violations: PolicyViolation[] = [];
  let contentBoundary: SafetyContentBoundary = parentPolicy.contentBoundary;
  let requireParentApprovalForAi = parentPolicy.requireParentApprovalForAi;
  let maxDailyStories = parentPolicy.maxDailyStories;
  let allowImageGeneration = parentPolicy.allowImageGeneration;
  let allowTts = parentPolicy.allowTts;
  const forbiddenThemes = new Set(parentPolicy.forbiddenThemes);

  if (
    !isBoundaryAtLeastAsRestrictive(
      parentPolicy.contentBoundary,
      baseline.contentBoundary,
    )
  ) {
    violations.push({
      code: "POLICY_LOOSENS_CONTENT_BOUNDARY",
      field: "contentBoundary",
      message: `Parent content boundary '${parentPolicy.contentBoundary}' is less restrictive than safety baseline '${baseline.contentBoundary}'`,
    });
    contentBoundary = stricterBoundary(
      parentPolicy.contentBoundary,
      baseline.contentBoundary,
    );
  }

  if (
    baseline.requireParentApprovalForAi &&
    !parentPolicy.requireParentApprovalForAi
  ) {
    violations.push({
      code: "POLICY_REMOVES_AI_APPROVAL",
      field: "requireParentApprovalForAi",
      message:
        "Parent policy cannot disable AI approval when safety baseline requires it",
    });
    requireParentApprovalForAi = true;
  }

  for (const theme of baseline.forbiddenThemes) {
    if (!forbiddenThemes.has(theme)) {
      violations.push({
        code: "POLICY_REMOVES_FORBIDDEN_THEME",
        field: "forbiddenThemes",
        message: `Parent policy must retain safety forbidden theme: ${theme}`,
      });
      forbiddenThemes.add(theme);
    }
  }

  if (parentPolicy.maxDailyStories > baseline.maxDailyStoriesCap) {
    violations.push({
      code: "POLICY_EXCEEDS_DAILY_STORY_CAP",
      field: "maxDailyStories",
      message: `Parent maxDailyStories ${parentPolicy.maxDailyStories} exceeds safety cap ${baseline.maxDailyStoriesCap}`,
    });
    maxDailyStories = baseline.maxDailyStoriesCap;
  }

  if (
    baseline.allowImageGeneration === false &&
    parentPolicy.allowImageGeneration
  ) {
    violations.push({
      code: "POLICY_ALLOWS_FORBIDDEN_IMAGES",
      field: "allowImageGeneration",
      message:
        "Parent policy cannot allow image generation when safety baseline forbids it",
    });
    allowImageGeneration = false;
  }

  if (baseline.allowTts === false && parentPolicy.allowTts) {
    violations.push({
      code: "POLICY_ALLOWS_FORBIDDEN_TTS",
      field: "allowTts",
      message: "Parent policy cannot allow TTS when safety baseline forbids it",
    });
    allowTts = false;
  }

  const sanitizedPolicy: ParentPolicyItem = {
    ...parentPolicy,
    contentBoundary,
    requireParentApprovalForAi,
    maxDailyStories,
    allowImageGeneration,
    allowTts,
    forbiddenThemes: Array.from(forbiddenThemes),
  };

  return {
    allowed: violations.length === 0,
    violations,
    sanitizedPolicy,
  };
}

function isBoundaryAtLeastAsRestrictive(
  parent: SafetyContentBoundary,
  baseline: SafetyContentBoundary,
): boolean {
  return BOUNDARY_RANK[parent] >= BOUNDARY_RANK[baseline];
}
