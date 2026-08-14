import { aiGenerationTraces } from "../db/schema/profile";
import { getProfileDb } from "./db";
import type { TextLlmGatewayResult } from "./text-llm-gateway.service";

export interface RecordAiGenerationTraceInput {
  householdId: string;
  childProfileId?: string | null;
  creationCycleId?: string | null;
  taskType: string;
  promptKey: string;
  promptVersion: number;
  inputContext: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  validationStatus: "valid" | "invalid";
  generated: TextLlmGatewayResult;
}

export async function recordAiGenerationTrace(
  input: RecordAiGenerationTraceInput,
) {
  const costFields = input.generated.cost
    ? {
        estimatedCostUsdMicros: input.generated.cost.estimatedCostUsdMicros,
        costSource: input.generated.cost.costSource,
        pricingSnapshot: input.generated.cost.pricingSnapshot,
      }
    : {};

  await getProfileDb()
    .insert(aiGenerationTraces)
    .values({
      id: crypto.randomUUID(),
      householdId: input.householdId,
      childProfileId: input.childProfileId ?? null,
      creationCycleId: input.creationCycleId ?? null,
      taskType: input.taskType,
      promptKey: input.promptKey,
      promptVersion: input.promptVersion,
      provider: input.generated.provider,
      modelId: input.generated.model,
      inputContext: input.inputContext,
      outputPayload: input.outputPayload,
      validationStatus: input.validationStatus,
      promptTokens: input.generated.promptTokens,
      completionTokens: input.generated.completionTokens,
      totalTokens: input.generated.totalTokens,
      ...costFields,
      latencyMs: input.generated.latencyMs,
    });
}
