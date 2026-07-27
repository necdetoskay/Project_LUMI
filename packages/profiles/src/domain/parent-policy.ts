import { ValidationError } from "./errors";

export interface ParentPolicyState {
  householdId: string;
  maxDailyStories: number;
  requireParentApprovalForAi: boolean;
  allowImageGeneration: boolean;
  allowTts: boolean;
  contentBoundary: ContentBoundary;
  timeLimitMinutes: number | null;
  safetyMetadata: ParentPolicyMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type ContentBoundary = "strict" | "moderate" | "open";

export interface ParentPolicyMetadata {
  blockedTopics?: string[];
  customNotes?: string[];
}

export interface PolicyAuditEntry {
  id: string;
  householdId: string;
  actorId: string;
  action: string;
  beforeState: Partial<ParentPolicyState>;
  afterState: Partial<ParentPolicyState>;
  createdAt: Date;
}

export class ParentPolicy {
  private state: ParentPolicyState;
  private readonly audits: PolicyAuditEntry[] = [];

  private constructor(state: ParentPolicyState) {
    this.state = { ...state };
  }

  static create(input: {
    householdId: string;
    maxDailyStories?: number;
    requireParentApprovalForAi?: boolean;
    allowImageGeneration?: boolean;
    allowTts?: boolean;
    contentBoundary?: ContentBoundary;
    timeLimitMinutes?: number | null;
    safetyMetadata?: ParentPolicyMetadata;
  }): ParentPolicy {
    const maxDailyStories = input.maxDailyStories ?? 3;
    if (!Number.isInteger(maxDailyStories) || maxDailyStories < 0 || maxDailyStories > 50) {
      throw new ValidationError(
        "INVALID_DAILY_LIMIT",
        "maxDailyStories must be between 0 and 50",
        "maxDailyStories",
      );
    }

    const contentBoundary = input.contentBoundary ?? "strict";
    if (!["strict", "moderate", "open"].includes(contentBoundary)) {
      throw new ValidationError(
        "INVALID_CONTENT_BOUNDARY",
        "Content boundary must be 'strict', 'moderate', or 'open'",
        "contentBoundary",
      );
    }

    const timeLimitMinutes = input.timeLimitMinutes ?? null;
    if (timeLimitMinutes !== null && (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 0)) {
      throw new ValidationError(
        "INVALID_TIME_LIMIT",
        "timeLimitMinutes must be a positive integer or null",
        "timeLimitMinutes",
      );
    }

    return new ParentPolicy({
      householdId: input.householdId,
      maxDailyStories,
      requireParentApprovalForAi: input.requireParentApprovalForAi ?? false,
      allowImageGeneration: input.allowImageGeneration ?? true,
      allowTts: input.allowTts ?? true,
      contentBoundary,
      timeLimitMinutes,
      safetyMetadata: input.safetyMetadata ?? {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromState(state: ParentPolicyState): ParentPolicy {
    return new ParentPolicy(state);
  }

  getState(): ParentPolicyState {
    return { ...this.state };
  }

  update(input: Partial<Omit<ParentPolicyState, "householdId" | "createdAt" | "updatedAt">>): void {
    const beforeState = { ...this.state };

    if (input.maxDailyStories !== undefined) {
      if (!Number.isInteger(input.maxDailyStories) || input.maxDailyStories < 0 || input.maxDailyStories > 50) {
        throw new ValidationError(
          "INVALID_DAILY_LIMIT",
          "maxDailyStories must be between 0 and 50",
          "maxDailyStories",
        );
      }
      this.state.maxDailyStories = input.maxDailyStories;
    }

    if (input.contentBoundary !== undefined) {
      if (!["strict", "moderate", "open"].includes(input.contentBoundary)) {
        throw new ValidationError(
          "INVALID_CONTENT_BOUNDARY",
          "Content boundary must be 'strict', 'moderate', or 'open'",
          "contentBoundary",
        );
      }
      this.state.contentBoundary = input.contentBoundary;
    }

    if (input.timeLimitMinutes !== undefined) {
      if (input.timeLimitMinutes !== null && (!Number.isInteger(input.timeLimitMinutes) || input.timeLimitMinutes < 0)) {
        throw new ValidationError(
          "INVALID_TIME_LIMIT",
          "timeLimitMinutes must be a positive integer or null",
          "timeLimitMinutes",
        );
      }
      this.state.timeLimitMinutes = input.timeLimitMinutes;
    }

    if (input.requireParentApprovalForAi !== undefined) {
      this.state.requireParentApprovalForAi = input.requireParentApprovalForAi;
    }
    if (input.allowImageGeneration !== undefined) {
      this.state.allowImageGeneration = input.allowImageGeneration;
    }
    if (input.allowTts !== undefined) {
      this.state.allowTts = input.allowTts;
    }
    if (input.safetyMetadata !== undefined) {
      this.state.safetyMetadata = { ...input.safetyMetadata };
    }

    this.state.updatedAt = new Date();
  }

  recordAudit(input: {
    id: string;
    actorId: string;
    action: string;
    beforeState: Partial<ParentPolicyState>;
    afterState: Partial<ParentPolicyState>;
  }): void {
    this.audits.push({
      id: input.id,
      householdId: this.state.householdId,
      actorId: input.actorId,
      action: input.action,
      beforeState: input.beforeState,
      afterState: input.afterState,
      createdAt: new Date(),
    });
  }

  getAuditTrail(): PolicyAuditEntry[] {
    return [...this.audits];
  }

  canGuardianExceed(): boolean {
    return this.state.requireParentApprovalForAi;
  }

  validateActivityDuration(minutesUsed: number): boolean {
    if (this.state.timeLimitMinutes === null) {
      return true;
    }
    return minutesUsed <= this.state.timeLimitMinutes;
  }
}
