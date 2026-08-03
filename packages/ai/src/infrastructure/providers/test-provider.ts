import type { ProviderUsage } from "../../domain/generation-types";
import {
  ProviderTimeoutError,
  ProviderUnavailableError,
} from "../../domain/generation-errors";
import type {
  GenerationProvider,
  ProviderCompletion,
  ProviderCompletionRequest,
} from "../../ports/provider.port";

export interface TestProviderScript {
  failWith?: "unavailable" | "timeout";
  failTimes?: number;
  rawResponse?: string;
  latencyMs?: number;
  usageOverride?: Partial<ProviderUsage>;
}

export interface TestProviderConfig {
  providerId?: string;
  model?: string;
  defaultRawResponse?: string;
  perRequestScripts?: Map<string, TestProviderScript>;
}

export class TestProvider implements GenerationProvider {
  public readonly providerId: string;
  public readonly model: string;
  public readonly defaultRawResponse: string;
  public calls: ProviderCompletionRequest[] = [];
  public failCount = 0;
  private readonly perRequestScripts: Map<string, TestProviderScript>;
  private readonly invocationCounts = new Map<string, number>();

  constructor(config: TestProviderConfig = {}) {
    this.providerId = config.providerId ?? "test-provider";
    this.model = config.model ?? "test-model";
    this.defaultRawResponse = config.defaultRawResponse ?? '{"ok":true}';
    this.perRequestScripts = config.perRequestScripts ?? new Map();
  }

  public scriptRequest(requestId: string, script: TestProviderScript): void {
    this.perRequestScripts.set(requestId, script);
  }

  public supportsModel(modelId: string): boolean {
    return modelId === this.model || modelId.startsWith("test-");
  }

  public async complete(
    request: ProviderCompletionRequest,
  ): Promise<ProviderCompletion> {
    this.calls.push(request);
    const script = this.perRequestScripts.get(request.requestId);

    const invocation = (this.invocationCounts.get(request.requestId) ?? 0) + 1;
    this.invocationCounts.set(request.requestId, invocation);

    const shouldFail =
      script?.failWith !== undefined &&
      (script.failTimes === undefined || invocation <= script.failTimes);

    const latency = script?.latencyMs ?? 0;
    if (latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }

    if (shouldFail) {
      this.failCount += 1;
      if (script?.failWith === "timeout") {
        throw new ProviderTimeoutError("Simulated provider timeout");
      }
      throw new ProviderUnavailableError("Simulated provider unavailable");
    }

    const content = script?.rawResponse ?? this.defaultRawResponse;

    return {
      content,
      providerId: this.providerId,
      model: request.model,
      usage: {
        promptTokens: script?.usageOverride?.promptTokens ?? 120,
        completionTokens: script?.usageOverride?.completionTokens ?? 40,
        totalTokens: script?.usageOverride?.totalTokens ?? 160,
        latencyMs: script?.usageOverride?.latencyMs ?? latency,
        costUsd: script?.usageOverride?.costUsd ?? 0.0001,
      },
    };
  }
}

export const DEFAULT_TEST_PROVIDER = new TestProvider();
