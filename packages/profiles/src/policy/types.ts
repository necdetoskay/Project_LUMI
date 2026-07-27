import type { ContentBoundary } from "../domain";

export interface PolicyValidationInput {
  householdId: string;
  maxDailyStories?: number;
  requireParentApprovalForAi?: boolean;
  allowImageGeneration?: boolean;
  allowTts?: boolean;
  contentBoundary?: string;
  timeLimitMinutes?: number | null;
}

export interface PolicyValidationResult {
  valid: boolean;
  errors: PolicyValidationError[];
  warnings: PolicyValidationWarning[];
}

export interface PolicyValidationError {
  code: string;
  field: string;
  message: string;
}

export interface PolicyValidationWarning {
  code: string;
  field: string;
  message: string;
}

export interface GuardianPermissionCheck {
  guardianUserId: string;
  householdId: string;
  requestedAction: string;
  parentPolicy: {
    requireParentApprovalForAi: boolean;
    contentBoundary: ContentBoundary;
  };
}
