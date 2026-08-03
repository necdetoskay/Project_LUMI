import { createHash } from "node:crypto";

import {
  SchemaValidationError,
  GenerationError,
} from "../domain/generation-errors";
import type {
  GenerationAttempt,
  GenerationRequest,
  GenerationResponse,
  ProviderUsage,
} from "../domain/generation-types";
import type { GenerationProvider } from "../ports/provider.port";
import type { ModelRouterPort } from "../ports/model-router.port";
import type { PromptComposerPort } from "../ports/prompt-composer.port";
import type { UsageRecorderPort } from "../ports/usage.port";
import type { GenerationValidatorPort } from "../ports/generation-validator.port";
import type { GenerationOrchestratorPort } from "../ports/orchestrator.port";

export interface OrchestratorDependencies {
  modelRouter: ModelRouterPort;
  promptComposer: PromptComposerPort;
  usageRecorder: UsageRecorderPort;
  validator: GenerationValidatorPort;
}

export interface OrchestratorOptions {
  maxRepairs?: number;
}

function defaultOptions(): Required<OrchestratorOptions> {
  return { maxRepairs: 1 };
}

export class GenerationOrchestrator implements GenerationOrchestratorPort {
  private readonly modelRouter: ModelRouterPort;
  private readonly promptComposer: PromptComposerPort;
  private readonly usageRecorder: UsageRecorderPort;
  private readonly validator: GenerationValidatorPort;
  private readonly maxRepairs: number;

  constructor(
    deps: OrchestratorDependencies,
    options: OrchestratorOptions = {},
  ) {
    this.modelRouter = deps.modelRouter;
    this.promptComposer = deps.promptComposer;
    this.usageRecorder = deps.usageRecorder;
    this.validator = deps.validator;
    this.maxRepairs = options.maxRepairs ?? defaultOptions().maxRepairs;
  }

  public async generate(
    request: GenerationRequest,
  ): Promise<GenerationResponse<unknown>> {
    return this.run(request);
  }

  public async generateTyped<T>(
    request: GenerationRequest,
  ): Promise<GenerationResponse<T>> {
    const response = await this.run(request);
    return response as GenerationResponse<T>;
  }

  private async run(
    request: GenerationRequest,
  ): Promise<GenerationResponse<unknown>> {
    const attempts: GenerationAttempt[] = [];

    const choice = await this.modelRouter.choose(
      request.modelPolicy,
      request.task,
    );
    const provider = this.modelRouter.provider(choice.providerId);
    if (!provider) {
      throw new SchemaValidationError(
        `Provider not registered: ${choice.providerId}`,
      );
    }

    let repairs = 0;
    const maxRepairs = Math.min(
      this.maxRepairs,
      request.modelPolicy.maxRepairs,
    );

    const composed = await this.promptComposer.compose({
      task: request.task,
      requestId: request.requestId,
      promptKey: request.promptKey,
      variables: request.variables,
    });

    let lastOutput: unknown | null = null;
    let finalStatus: GenerationResponse<unknown>["status"] = "pending";

    while (attempts.length < request.modelPolicy.maxAttempts) {
      const attemptNumber = attempts.length + 1;
      let usage: ProviderUsage | null = null;

      try {
        const completion = await this.callProvider(
          provider,
          request,
          choice.modelId,
          composed,
        );

        usage = completion.usage;
        const output = this.tryParseJson(completion.content);

        const report = await this.validator.validate(
          request.task,
          output,
          request.variables,
        );
        if (!report.valid) {
          const hasError = report.findings.some((f) => f.severity === "error");
          if (hasError && repairs < maxRepairs) {
            repairs += 1;
            attempts.push({
              attemptNumber,
              providerId: choice.providerId,
              modelId: choice.modelId,
              status: "failure",
              failureState: "schema_invalid",
              usage: this.completeUsage(usage),
              repaired: true,
            });
            this.recordUsage(
              request,
              choice.modelId,
              usage,
              attemptNumber,
              "failed",
              "schema_invalid",
            );
            continue;
          }
          if (hasError) {
            attempts.push({
              attemptNumber,
              providerId: choice.providerId,
              modelId: choice.modelId,
              status: "failure",
              failureState: "schema_invalid",
              usage: this.completeUsage(usage),
              repaired: repairs > 0,
            });
            this.recordUsage(
              request,
              choice.modelId,
              usage,
              attemptNumber,
              "failed",
              "schema_invalid",
            );
            return this.finalize(
              request,
              attempts,
              null,
              choice.providerId,
              choice.modelId,
              "failed",
              "schema_invalid",
            );
          }
        }

        lastOutput = output;
        finalStatus = "approved";
        attempts.push({
          attemptNumber,
          providerId: choice.providerId,
          modelId: choice.modelId,
          status: "success",
          usage: this.completeUsage(usage),
          repaired: false,
        });
        this.recordUsage(
          request,
          choice.modelId,
          usage,
          attemptNumber,
          "success",
        );
        return this.finalize(
          request,
          attempts,
          lastOutput,
          choice.providerId,
          choice.modelId,
          "approved",
        );
      } catch (error) {
        const failureState = this.mapError(error).failureState;
        attempts.push({
          attemptNumber,
          providerId: choice.providerId,
          modelId: choice.modelId,
          status: "failure",
          failureState,
          usage: this.completeUsage(usage),
          repaired: repairs > 0,
        });
        this.recordUsage(
          request,
          choice.modelId,
          usage,
          attemptNumber,
          "failed",
          failureState,
        );

        if (attempts.length >= request.modelPolicy.maxAttempts) {
          return this.finalize(
            request,
            attempts,
            null,
            choice.providerId,
            choice.modelId,
            "failed",
            failureState,
          );
        }
      }
    }

    return this.finalize(
      request,
      attempts,
      lastOutput,
      choice.providerId,
      choice.modelId,
      finalStatus,
    );
  }

  private async callProvider(
    provider: GenerationProvider,
    request: GenerationRequest,
    modelId: string,
    composed: { systemPrompt: string; prompt: string; jsonMode: boolean },
  ) {
    const startedAt = Date.now();
    const completion = await provider.complete({
      requestId: request.requestId,
      task: request.task,
      model: modelId,
      systemPrompt: composed.systemPrompt,
      prompt: composed.prompt,
      temperature: 0.7,
      maxTokens: 2048,
      timeoutMs: request.modelPolicy.timeoutMs,
      ...(request.seed !== undefined ? { seed: hashSeed(request.seed) } : {}),
      jsonMode: composed.jsonMode,
    });
    completion.usage.latencyMs = Date.now() - startedAt;
    return completion;
  }

  private tryParseJson(content: string): unknown {
    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new SchemaValidationError("Provider returned invalid JSON.");
    }
  }

  private completeUsage(usage: ProviderUsage | null): ProviderUsage {
    return (
      usage ?? {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs: 0,
        costUsd: 0,
      }
    );
  }

  private recordUsage(
    request: GenerationRequest,
    modelId: string,
    usage: ProviderUsage | null,
    attempt: number,
    outcome: "success" | "failed",
    failureState?: string,
  ): void {
    void this.usageRecorder.record(this.completeUsage(usage), {
      requestId: request.requestId,
      providerId: "unknown",
      modelId,
      task: request.task,
      startedAt: new Date(),
      completedAt: new Date(),
      attempt,
      outcome,
      ...(failureState ? { failureState } : {}),
      childContent: request.task !== "origin_candidate",
    });
  }

  private finalize(
    request: GenerationRequest,
    attempts: GenerationAttempt[],
    output: unknown | null,
    providerId: string | null,
    modelId: string | null,
    status: GenerationResponse<unknown>["status"],
    failureState?: GenerationResponse<unknown>["failureState"],
  ): GenerationResponse<unknown> {
    return {
      requestId: request.requestId,
      task: request.task,
      status,
      output,
      modelId,
      providerId,
      attempts,
      ...(failureState ? { failureState } : {}),
      outputHash: output === null ? "" : hashOutput(output),
    };
  }

  public mapError(error: unknown): GenerationError {
    if (error instanceof GenerationError) {
      return error;
    }
    return new SchemaValidationError(messageOf(error));
  }
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashOutput(output: unknown): string {
  return createHash("sha256").update(JSON.stringify(output)).digest("hex");
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
