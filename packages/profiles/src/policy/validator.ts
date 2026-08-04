import type {
  GuardianPermissionCheck,
  PolicyValidationInput,
  PolicyValidationResult,
} from "./types";
import { AGE_BANDS, STORY_LENGTHS } from "../domain";

export function validatePolicyInput(
  input: PolicyValidationInput,
): PolicyValidationResult {
  const errors: PolicyValidationResult["errors"] = [];
  const warnings: PolicyValidationResult["warnings"] = [];

  if (input.maxDailyStories !== undefined) {
    if (!Number.isInteger(input.maxDailyStories) || input.maxDailyStories < 0) {
      errors.push({
        code: "INVALID_DAILY_LIMIT",
        field: "maxDailyStories",
        message: "maxDailyStories must be a non-negative integer",
      });
    } else if (input.maxDailyStories > 50) {
      errors.push({
        code: "DAILY_LIMIT_TOO_HIGH",
        field: "maxDailyStories",
        message: "maxDailyStories cannot exceed 50",
      });
    }
  }

  if (input.contentBoundary !== undefined) {
    const validBoundaries = ["strict", "moderate", "open"];
    if (!validBoundaries.includes(input.contentBoundary)) {
      errors.push({
        code: "INVALID_CONTENT_BOUNDARY",
        field: "contentBoundary",
        message: `contentBoundary must be one of: ${validBoundaries.join(", ")}`,
      });
    }
  }

  if (input.timeLimitMinutes !== undefined && input.timeLimitMinutes !== null) {
    if (
      !Number.isInteger(input.timeLimitMinutes) ||
      input.timeLimitMinutes < 1
    ) {
      errors.push({
        code: "INVALID_TIME_LIMIT",
        field: "timeLimitMinutes",
        message: "timeLimitMinutes must be a positive integer or null",
      });
    }
    if (input.timeLimitMinutes !== null && input.timeLimitMinutes > 1440) {
      warnings.push({
        code: "TIME_LIMIT_EXCEEDS_DAY",
        field: "timeLimitMinutes",
        message: "timeLimitMinutes exceeds 24 hours (1440 minutes)",
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function checkGuardianPermission(input: GuardianPermissionCheck): {
  allowed: boolean;
  reason?: string;
} {
  const { parentPolicy, requestedAction } = input;

  if (requestedAction === "ai_content_generation") {
    if (parentPolicy.requireParentApprovalForAi) {
      return {
        allowed: false,
        reason: "AI content generation requires parent approval",
      };
    }
  }

  if (requestedAction === "image_generation") {
    if (
      parentPolicy.contentBoundary === "strict" &&
      !parentPolicy.requireParentApprovalForAi
    ) {
      return {
        allowed: true,
        reason: "Image generation allowed under strict boundary",
      };
    }
  }

  return { allowed: true };
}

export function validateAgeBandConsistency(
  ageBand: string,
  storyLength: string,
  interactionLevel: number,
): PolicyValidationResult {
  const errors: PolicyValidationResult["errors"] = [];
  const warnings: PolicyValidationResult["warnings"] = [];

  if (!(AGE_BANDS as readonly string[]).includes(ageBand)) {
    errors.push({
      code: "INVALID_AGE_BAND",
      field: "ageBand",
      message: `ageBand must be one of: ${AGE_BANDS.join(", ")}`,
    });
  }

  if (!(STORY_LENGTHS as readonly string[]).includes(storyLength)) {
    errors.push({
      code: "INVALID_STORY_LENGTH",
      field: "storyLength",
      message: `storyLength must be one of: ${STORY_LENGTHS.join(", ")}`,
    });
  }

  if (
    !Number.isInteger(interactionLevel) ||
    interactionLevel < 0 ||
    interactionLevel > 5
  ) {
    errors.push({
      code: "INVALID_INTERACTION_LEVEL",
      field: "interactionLevel",
      message: "interactionLevel must be an integer between 0 and 5",
    });
  }

  if (ageBand === "3-5" && interactionLevel > 2) {
    warnings.push({
      code: "HIGH_INTERACTION_YOUNG_AGE",
      field: "interactionLevel",
      message: "High interaction level may not be suitable for age band 3-5",
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}
