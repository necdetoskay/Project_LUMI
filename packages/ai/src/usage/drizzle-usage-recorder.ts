import type { ProviderUsage } from "../domain/generation-types";
import { withCost } from "./cost-estimator";
import type { ValidationFinding } from "../domain/validation-types";
import type {
  UsageEstimate,
  UsageRecorderPort,
  UsageRecord,
} from "../ports/usage.port";
import type { UsageRepository } from "../db/repositories/interfaces/usage.repository";
import type { Database } from "../db/client";

export class DrizzleUsageRecorder implements UsageRecorderPort {
  private readonly db: Database;
  private readonly repo: UsageRepository;

  constructor(db: Database, repo: UsageRepository) {
    this.db = db;
    this.repo = repo;
  }

  public async record(
    usage: ProviderUsage,
    meta: Omit<
      UsageRecord,
      "inputTokens" | "outputTokens" | "totalTokens" | "costUsd" | "latencyMs"
    >,
  ): Promise<void> {
    const costUsd = withCost(usage).costUsd;
    await this.repo.create(this.db, {
      requestId: meta.requestId,
      providerId: meta.providerId,
      modelId: meta.modelId,
      task: meta.task,
      startedAt: meta.startedAt,
      completedAt: meta.completedAt,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      latencyMs: usage.latencyMs,
      attempt: meta.attempt,
      outcome: meta.outcome,
      ...(meta.failureState ? { failureState: meta.failureState } : {}),
      validationFindings: (meta.validationFindings ?? []) as unknown as object,
      costUsd: costUsd.toFixed(8),
      childContent: meta.childContent ?? false,
    });
  }

  public estimate(
    inputTokens: number,
    outputTokens: number,
    modelId: string,
  ): UsageEstimate {
    void modelId;
    const estimatedCostUsd = withCost({
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
      latencyMs: 0,
    }).costUsd;
    return { estimatedCostUsd, currency: "usd" };
  }

  public async recentForRequest(requestId: string): Promise<UsageRecord[]> {
    const rows = await this.repo.listByRequest(this.db, requestId);
    return rows.map((row) => {
      const record: UsageRecord = {
        requestId: row.requestId,
        providerId: row.providerId,
        modelId: row.modelId,
        task: row.task,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        totalTokens: row.totalTokens,
        latencyMs: row.latencyMs,
        attempt: row.attempt,
        outcome: row.outcome as UsageRecord["outcome"],
        costUsd: Number(row.costUsd),
        childContent: row.childContent,
      };
      if (row.failureState) {
        record.failureState = row.failureState;
      }
      if (
        Array.isArray(row.validationFindings) &&
        row.validationFindings.length > 0
      ) {
        record.validationFindings =
          row.validationFindings as unknown as ValidationFinding[];
      }
      return record;
    });
  }
}
