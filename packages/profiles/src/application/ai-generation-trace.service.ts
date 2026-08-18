import { DrizzleAiGenerationTraceRepository } from "../db/repositories";
import { getProfileDb } from "./db";
import type { AssembledGenerationContext } from "./generation-context-assembler";
import type { TextLlmGatewayResult } from "./text-llm-gateway.service";

export interface AiGenerationContextTraceEvidence {
  contextFingerprint: string;
  contextProvenance: Record<string, unknown>;
}

export interface RecordAiGenerationTraceInput {
  householdId: string;
  childProfileId?: string | null;
  creationCycleId?: string | null;
  taskType: string;
  promptKey: string;
  promptVersion: number;
  inputContext: Record<string, unknown>;
  contextEvidence?: AiGenerationContextTraceEvidence;
  outputPayload: Record<string, unknown>;
  validationStatus: "valid" | "invalid";
  generated: TextLlmGatewayResult;
}

export function createAiGenerationContextTraceEvidence(
  assembled: AssembledGenerationContext,
): AiGenerationContextTraceEvidence {
  return {
    contextFingerprint: assembled.fingerprint,
    contextProvenance: {
      profile: assembled.profile,
      maxContextTokens: assembled.maxContextTokens,
      estimatedTokens: assembled.estimatedTokens,
      droppedSections: [...assembled.droppedSections],
      sections: assembled.sections.map((section) => ({
        section: section.section,
        priority: section.priority,
        maxTokens: section.maxTokens,
        estimatedTokens: section.estimatedTokens,
        provenance: {
          source: section.provenance.source,
          sourceVersion: section.provenance.sourceVersion,
          authority: section.provenance.authority,
          reason: section.provenance.reason,
          ...(section.provenance.updatedAt
            ? { updatedAt: section.provenance.updatedAt }
            : {}),
          ...(section.provenance.compaction
            ? { compaction: section.provenance.compaction }
            : {}),
        },
      })),
    },
  };
}

export async function recordAiGenerationTrace(
  input: RecordAiGenerationTraceInput,
) {
  const repository = new DrizzleAiGenerationTraceRepository(getProfileDb());
  const costFields = input.generated.cost
    ? {
        estimatedCostUsdMicros: input.generated.cost.estimatedCostUsdMicros,
        costSource: input.generated.cost.costSource,
        pricingSnapshot: input.generated.cost.pricingSnapshot,
      }
    : {};
  const contextEvidenceFields = input.contextEvidence
    ? {
        contextFingerprint: input.contextEvidence.contextFingerprint,
        contextProvenance: input.contextEvidence.contextProvenance,
      }
    : {};

  return repository.create({
    householdId: input.householdId,
    childProfileId: input.childProfileId ?? null,
    creationCycleId: input.creationCycleId ?? null,
    taskType: input.taskType,
    promptKey: input.promptKey,
    promptVersion: input.promptVersion,
    provider: input.generated.provider,
    modelId: input.generated.model,
    inputContext: input.inputContext,
    ...contextEvidenceFields,
    outputPayload: input.outputPayload,
    validationStatus: input.validationStatus,
    promptTokens: input.generated.promptTokens,
    completionTokens: input.generated.completionTokens,
    totalTokens: input.generated.totalTokens,
    ...costFields,
    latencyMs: input.generated.latencyMs,
  });
}
