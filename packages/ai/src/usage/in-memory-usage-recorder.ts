import type { ProviderUsage } from "../domain/generation-types";
import { withCost } from "./cost-estimator";
import type {
  UsageEstimate,
  UsageRecorderPort,
  UsageRecord,
} from "../ports/usage.port";

export class InMemoryUsageRecorder implements UsageRecorderPort {
  private readonly records: UsageRecord[] = [];
  private readonly tokenRates: Record<
    string,
    { input: number; output: number }
  >;

  constructor(
    tokenRates: Record<string, { input: number; output: number }> = {},
  ) {
    this.tokenRates = tokenRates;
  }

  public async record(
    usage: ProviderUsage,
    meta: Omit<
      UsageRecord,
      "inputTokens" | "outputTokens" | "totalTokens" | "costUsd" | "latencyMs"
    >,
  ): Promise<void> {
    this.records.push({
      ...meta,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      latencyMs: usage.latencyMs,
      costUsd: usage.costUsd,
    });
  }

  public estimate(
    inputTokens: number,
    outputTokens: number,
    modelId: string,
  ): UsageEstimate {
    const rate = this.tokenRates[modelId];
    if (!rate) {
      return {
        estimatedCostUsd: withCost({
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
          latencyMs: 0,
        }).costUsd,
        currency: "usd",
      };
    }
    const inputCost = (inputTokens / 1_000_000) * rate.input;
    const outputCost = (outputTokens / 1_000_000) * rate.output;
    const estimatedCostUsd =
      Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
    return { estimatedCostUsd, currency: "usd" };
  }

  public async recentForRequest(requestId: string): Promise<UsageRecord[]> {
    return this.records
      .filter((record) => record.requestId === requestId)
      .slice()
      .reverse();
  }

  public allRecords(): UsageRecord[] {
    return this.records.slice();
  }
}
