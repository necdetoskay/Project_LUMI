import type { ProviderUsage } from "../domain/generation-types";
import type { ValidationFinding } from "../domain/validation-types";

export interface UsageRecord {
  requestId: string;
  providerId: string;
  modelId: string;
  task: string;
  startedAt: Date;
  completedAt: Date;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  attempt: number;
  outcome: "success" | "failed";
  failureState?: string;
  validationFindings?: ValidationFinding[];
  costUsd: number;
  childContent?: boolean;
}

export interface UsageEstimate {
  estimatedCostUsd: number;
  currency: "usd";
}

export interface UsageRecorderPort {
  record(
    usage: ProviderUsage,
    meta: Omit<
      UsageRecord,
      "inputTokens" | "outputTokens" | "totalTokens" | "costUsd" | "latencyMs"
    >,
  ): Promise<void>;
  estimate(
    inputTokens: number,
    outputTokens: number,
    modelId: string,
  ): UsageEstimate;
  recentForRequest(requestId: string): Promise<UsageRecord[]>;
}
