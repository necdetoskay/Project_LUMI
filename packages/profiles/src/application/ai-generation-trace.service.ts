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

export interface AiGenerationContextInspectorReplayReference {
  kind: "content_addressed_snapshot";
  store: string;
  snapshotDigest: string;
  snapshotVersion: string;
}

export interface AiGenerationContextInspectorSection {
  section: string;
  priority: string | null;
  maxTokens: number | null;
  estimatedTokens: number | null;
  source: string | null;
  sourceVersion: string | null;
  revisionFingerprint: string | null;
  replay: AiGenerationContextInspectorReplayReference | null;
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
  | "replay_requires_historical_compaction"
  | "some_sources_not_replayable"
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
    observability: {
      budgetUtilizationRatio: number | null;
      contextToOutputTokenRatio: number | null;
    };
    droppedSections: string[];
    sections: AiGenerationContextInspectorSection[];
  };
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

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

function safeRatio(
  numerator: number | null,
  denominator: number | null,
): number | null {
  if (
    numerator === null ||
    denominator === null ||
    numerator < 0 ||
    denominator <= 0
  ) {
    return null;
  }
  return numerator / denominator;
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

function toInspectorReplayReference(
  value: unknown,
): AiGenerationContextInspectorReplayReference | null {
  const replay = asRecord(value);
  if (!replay) return null;
  const kind = asString(replay.kind);
  const store = asString(replay.store);
  const snapshotDigest = asString(replay.snapshotDigest);
  const snapshotVersion = asString(replay.snapshotVersion);

  if (
    kind !== "content_addressed_snapshot" ||
    !store?.trim() ||
    !snapshotVersion?.trim() ||
    !snapshotDigest ||
    !SHA256_HEX.test(snapshotDigest)
  ) {
    return null;
  }

  return {
    kind,
    store,
    snapshotDigest,
    snapshotVersion,
  };
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
    replay: toInspectorReplayReference(provenance?.replay),
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
          ...(section.provenance.replay
            ? { replay: section.provenance.replay }
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
  const replayableSectionCount = input.sections.filter((section) =>
    Boolean(section.replay),
  ).length;
  const allSectionsReplayable =
    hasSections && replayableSectionCount === input.sections.length;

  if (allSectionsReplayable) {
    if (input.sections.some((section) => Boolean(section.compaction))) {
      return {
        reconstructability: "partial",
        reconstructabilityReason: "replay_requires_historical_compaction",
      };
    }
    return {
      reconstructability: "exact",
      reconstructabilityReason: "all_sources_replayable",
    };
  }

  if (replayableSectionCount > 0) {
    return {
      reconstructability: "partial",
      reconstructabilityReason: "some_sources_not_replayable",
    };
  }

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
  const maxContextTokens = asNumber(provenance?.maxContextTokens);
  const estimatedContextTokens = asNumber(provenance?.estimatedTokens);

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
      maxContextTokens,
      estimatedTokens: estimatedContextTokens,
      observability: {
        budgetUtilizationRatio: safeRatio(
          estimatedContextTokens,
          maxContextTokens,
        ),
        contextToOutputTokenRatio: safeRatio(
          estimatedContextTokens,
          record.completionTokens,
        ),
      },
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
