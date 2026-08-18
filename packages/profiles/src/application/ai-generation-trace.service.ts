import { createHash } from "node:crypto";

import { DrizzleAiGenerationTraceRepository } from "../db/repositories";
import type { AiGenerationTraceRecord } from "../db/schema/profile";
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

export interface AiGenerationContextInspectorSection {
  section: string;
  priority: string | null;
  maxTokens: number | null;
  estimatedTokens: number | null;
  source: string | null;
  sourceVersion: string | null;
  revisionFingerprint: string | null;
  authority: string | null;
  reason: string | null;
  updatedAt: string | null;
  compaction: {
    strategy: string | null;
    originalTokens: number | null;
    compactedTokens: number | null;
    removedItems: number | null;
  } | null;
}

export type AiGenerationContextReconstructability =
  | "exact"
  | "partial"
  | "non_reconstructable";

export type AiGenerationContextReconstructabilityReason =
  | "all_sources_replayable"
  | "source_revisions_verifiable_but_not_replayable"
  | "source_revision_evidence_incomplete"
  | "context_evidence_missing";

export interface AiGenerationContextInspectorView {
  id: string;
  taskType: string;
  promptKey: string;
  promptVersion: number;
  provider: string;
  modelId: string;
  validationStatus: "valid" | "invalid";
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsdMicros: number | null;
  latencyMs: number;
  createdAt: string;
  context: {
    fingerprint: string | null;
    reconstructability: AiGenerationContextReconstructability;
    reconstructabilityReason: AiGenerationContextReconstructabilityReason;
    profile: string | null;
    maxContextTokens: number | null;
    estimatedTokens: number | null;
    droppedSections: string[];
    sections: AiGenerationContextInspectorSection[];
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function fingerprintSourceRevision(input: {
  source: string;
  sourceVersion: string;
  revision: string;
}): string {
  return createHash("sha256")
    .update(
      `${input.source}\u0000${input.sourceVersion}\u0000${input.revision}`,
    )
    .digest("hex");
}

function toInspectorSection(
  value: unknown,
): AiGenerationContextInspectorSection | null {
  const section = asRecord(value);
  if (!section) return null;
  const sectionName = asString(section.section);
  if (!sectionName) return null;

  const provenance = asRecord(section.provenance);
  const compaction = asRecord(provenance?.compaction);

  return {
    section: sectionName,
    priority: asString(section.priority),
    maxTokens: asNumber(section.maxTokens),
    estimatedTokens: asNumber(section.estimatedTokens),
    source: asString(provenance?.source),
    sourceVersion: asString(provenance?.sourceVersion),
    revisionFingerprint: asString(provenance?.revisionFingerprint),
    authority: asString(provenance?.authority),
    reason: asString(provenance?.reason),
    updatedAt: asString(provenance?.updatedAt),
    compaction: compaction
      ? {
          strategy: asString(compaction.strategy),
          originalTokens: asNumber(compaction.originalTokens),
          compactedTokens: asNumber(compaction.compactedTokens),
          removedItems: asNumber(compaction.removedItems),
        }
      : null,
  };
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
          ...(section.provenance.revision
            ? {
                revisionFingerprint: fingerprintSourceRevision({
                  source: section.provenance.source,
                  sourceVersion: section.provenance.sourceVersion,
                  revision: section.provenance.revision,
                }),
              }
            : {}),
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

function resolveReconstructability(input: {
  hasAuditEvidence: boolean;
  sections: readonly AiGenerationContextInspectorSection[];
}): {
  reconstructability: AiGenerationContextReconstructability;
  reconstructabilityReason: AiGenerationContextReconstructabilityReason;
} {
  if (!input.hasAuditEvidence) {
    return {
      reconstructability: "non_reconstructable",
      reconstructabilityReason: "context_evidence_missing",
    };
  }

  const hasSections = input.sections.length > 0;
  const allSectionsHaveRevisionEvidence =
    hasSections &&
    input.sections.every((section) => Boolean(section.revisionFingerprint));

  if (allSectionsHaveRevisionEvidence) {
    return {
      reconstructability: "partial",
      reconstructabilityReason:
        "source_revisions_verifiable_but_not_replayable",
    };
  }

  return {
    reconstructability: "partial",
    reconstructabilityReason: "source_revision_evidence_incomplete",
  };
}

export function toAiGenerationContextInspectorView(
  record: AiGenerationTraceRecord,
): AiGenerationContextInspectorView {
  const provenance = asRecord(record.contextProvenance);
  const sections = Array.isArray(provenance?.sections)
    ? provenance.sections
        .map(toInspectorSection)
        .filter((section): section is AiGenerationContextInspectorSection =>
          Boolean(section),
        )
    : [];
  const droppedSections = Array.isArray(provenance?.droppedSections)
    ? provenance.droppedSections.filter(
        (section): section is string => typeof section === "string",
      )
    : [];
  const hasAuditEvidence = Boolean(record.contextFingerprint && provenance);
  const reconstruction = resolveReconstructability({
    hasAuditEvidence,
    sections,
  });

  return {
    id: record.id,
    taskType: record.taskType,
    promptKey: record.promptKey,
    promptVersion: record.promptVersion,
    provider: record.provider,
    modelId: record.modelId,
    validationStatus: record.validationStatus,
    promptTokens: record.promptTokens,
    completionTokens: record.completionTokens,
    totalTokens: record.totalTokens,
    estimatedCostUsdMicros: record.estimatedCostUsdMicros,
    latencyMs: record.latencyMs,
    createdAt: record.createdAt.toISOString(),
    context: {
      fingerprint: record.contextFingerprint,
      ...reconstruction,
      profile: asString(provenance?.profile),
      maxContextTokens: asNumber(provenance?.maxContextTokens),
      estimatedTokens: asNumber(provenance?.estimatedTokens),
      droppedSections,
      sections,
    },
  };
}

export async function getAiGenerationContextInspectorTrace(
  householdId: string,
  traceId: string,
): Promise<AiGenerationContextInspectorView | null> {
  const repository = new DrizzleAiGenerationTraceRepository(getProfileDb());
  const record = await repository.findByIdForHousehold(traceId, householdId);
  return record ? toAiGenerationContextInspectorView(record) : null;
}

export async function listAiGenerationContextInspectorTraces(
  householdId: string,
  limit = 50,
): Promise<AiGenerationContextInspectorView[]> {
  const repository = new DrizzleAiGenerationTraceRepository(getProfileDb());
  const records = await repository.listByHousehold(householdId, limit);
  return records.map(toAiGenerationContextInspectorView);
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
