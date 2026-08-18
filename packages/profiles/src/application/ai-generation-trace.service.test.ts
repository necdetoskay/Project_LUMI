import { describe, expect, it } from "vitest";

import type { AiGenerationTraceRecord } from "../db/schema/profile";
import {
  createAiGenerationContextTraceEvidence,
  toAiGenerationContextInspectorView,
} from "./ai-generation-trace.service";
import type { AssembledGenerationContext } from "./generation-context-assembler";

const REVISION_FINGERPRINT =
  "543e13dd8adbed260aa1494058d07903928692256459d98821eb39e0cdb16bfe";
const SNAPSHOT_DIGEST = "b".repeat(64);

function assembledContext(): AssembledGenerationContext {
  return {
    profile: "character_onboarding",
    maxContextTokens: 3_600,
    estimatedTokens: 420,
    fingerprint: "a".repeat(64),
    droppedSections: ["relevant_memories"],
    sections: [
      {
        section: "child_personalization",
        priority: "required",
        maxTokens: 600,
        estimatedTokens: 120,
        value: {
          childProfileId: "SECRET-CHILD-ID",
          interests: ["space"],
        },
        provenance: {
          source: "canonical-child-profile",
          sourceId: "SECRET-SOURCE-ID",
          sourceVersion: "v1",
          revision: "SECRET-REVISION",
          authority: "canonical",
          reason: "personalization",
          updatedAt: "2026-08-18T00:00:00.000Z",
          compaction: {
            strategy: "dedupe-and-tail-prune-v1",
            originalTokens: 200,
            compactedTokens: 120,
            removedItems: 2,
          },
        },
      },
    ],
  };
}

function replayableAssembledContext(
  options: { compacted?: boolean } = {},
): AssembledGenerationContext {
  const assembled = assembledContext();
  const section = assembled.sections[0]!;
  const provenance = { ...section.provenance };
  if (!options.compacted) {
    delete provenance.compaction;
  }

  return {
    ...assembled,
    sections: [
      {
        ...section,
        provenance: {
          ...provenance,
          replay: {
            kind: "content_addressed_snapshot",
            store: "context.snapshots",
            snapshotDigest: SNAPSHOT_DIGEST,
            snapshotVersion: "v1",
          },
        },
      },
    ],
  };
}

function traceRecord(
  overrides: Partial<AiGenerationTraceRecord> = {},
  assembled: AssembledGenerationContext = assembledContext(),
): AiGenerationTraceRecord {
  const evidence = createAiGenerationContextTraceEvidence(assembled);
  return {
    id: "11111111-1111-4111-8111-111111111111",
    householdId: "22222222-2222-4222-8222-222222222222",
    childProfileId: "33333333-3333-4333-8333-333333333333",
    creationCycleId: "44444444-4444-4444-8444-444444444444",
    taskType: "character_world_suggestions",
    promptKey: "character_onboarding.world_character_suggestions",
    promptVersion: 4,
    provider: "openrouter",
    modelId: "mock/context-inspector",
    inputContext: {
      secretChildValue: "SECRET-INPUT-CONTEXT",
    },
    contextFingerprint: evidence.contextFingerprint,
    contextProvenance: evidence.contextProvenance,
    outputPayload: {
      secretGeneratedValue: "SECRET-OUTPUT-PAYLOAD",
    },
    validationStatus: "valid",
    promptTokens: 500,
    completionTokens: 100,
    totalTokens: 600,
    estimatedCostUsdMicros: 42,
    costSource: "pricing_snapshot",
    pricingSnapshot: {
      currency: "USD",
      modelId: "mock/context-inspector",
      capturedAt: "2026-08-18T00:00:00.000Z",
    },
    latencyMs: 321,
    createdAt: new Date("2026-08-18T00:00:00.000Z"),
    ...overrides,
  };
}

describe("createAiGenerationContextTraceEvidence", () => {
  it("persists fingerprint and privacy-safe source revision evidence without context values or internal identifiers", () => {
    const evidence = createAiGenerationContextTraceEvidence(assembledContext());
    const serialized = JSON.stringify(evidence);

    expect(evidence.contextFingerprint).toBe("a".repeat(64));
    expect(evidence.contextProvenance).toMatchObject({
      profile: "character_onboarding",
      maxContextTokens: 3_600,
      estimatedTokens: 420,
      droppedSections: ["relevant_memories"],
      sections: [
        {
          provenance: {
            revisionFingerprint: REVISION_FINGERPRINT,
          },
        },
      ],
    });
    expect(serialized).toContain("canonical-child-profile");
    expect(serialized).toContain("dedupe-and-tail-prune-v1");
    expect(serialized).toContain(REVISION_FINGERPRINT);
    expect(serialized).not.toContain("SECRET-CHILD-ID");
    expect(serialized).not.toContain("SECRET-SOURCE-ID");
    expect(serialized).not.toContain("SECRET-REVISION");
    expect(serialized).not.toContain("interests");
  });

  it("persists only the content-addressed replay locator, not internal source identifiers or values", () => {
    const evidence = createAiGenerationContextTraceEvidence(
      replayableAssembledContext(),
    );
    const serialized = JSON.stringify(evidence);

    expect(evidence.contextProvenance).toMatchObject({
      sections: [
        {
          provenance: {
            replay: {
              kind: "content_addressed_snapshot",
              store: "context.snapshots",
              snapshotDigest: SNAPSHOT_DIGEST,
              snapshotVersion: "v1",
            },
          },
        },
      ],
    });
    expect(serialized).toContain(SNAPSHOT_DIGEST);
    expect(serialized).not.toContain("SECRET-CHILD-ID");
    expect(serialized).not.toContain("SECRET-SOURCE-ID");
  });
});

describe("toAiGenerationContextInspectorView", () => {
  it("reports partial reconstruction and derived observability metrics for privacy-safe trace evidence", () => {
    const view = toAiGenerationContextInspectorView(traceRecord());
    const serialized = JSON.stringify(view);

    expect(view.context).toMatchObject({
      fingerprint: "a".repeat(64),
      reconstructability: "partial",
      reconstructabilityReason:
        "source_revisions_verifiable_but_not_replayable",
      profile: "character_onboarding",
      maxContextTokens: 3_600,
      estimatedTokens: 420,
      observability: {
        budgetUtilizationRatio: 420 / 3_600,
        contextToOutputTokenRatio: 4.2,
      },
      droppedSections: ["relevant_memories"],
    });
    expect(view.context.sections).toEqual([
      {
        section: "child_personalization",
        priority: "required",
        maxTokens: 600,
        estimatedTokens: 120,
        source: "canonical-child-profile",
        sourceVersion: "v1",
        revisionFingerprint: REVISION_FINGERPRINT,
        replay: null,
        authority: "canonical",
        reason: "personalization",
        updatedAt: "2026-08-18T00:00:00.000Z",
        compaction: {
          strategy: "dedupe-and-tail-prune-v1",
          originalTokens: 200,
          compactedTokens: 120,
          removedItems: 2,
        },
      },
    ]);
    expect(view.promptKey).toBe(
      "character_onboarding.world_character_suggestions",
    );
    expect(view.totalTokens).toBe(600);
    expect(serialized).not.toContain("SECRET-INPUT-CONTEXT");
    expect(serialized).not.toContain("SECRET-OUTPUT-PAYLOAD");
    expect(serialized).not.toContain("33333333-3333-4333-8333-333333333333");
    expect(serialized).not.toContain("44444444-4444-4444-8444-444444444444");
  });

  it("does not invent a context-to-output ratio when completion usage is unavailable or zero", () => {
    const missingUsage = toAiGenerationContextInspectorView(
      traceRecord({ completionTokens: null }),
    );
    const zeroUsage = toAiGenerationContextInspectorView(
      traceRecord({ completionTokens: 0 }),
    );

    expect(
      missingUsage.context.observability.contextToOutputTokenRatio,
    ).toBeNull();
    expect(zeroUsage.context.observability.contextToOutputTokenRatio).toBeNull();
  });

  it("reports exact reconstruction only when every section has immutable replay evidence and no historical transform is required", () => {
    const view = toAiGenerationContextInspectorView(
      traceRecord({}, replayableAssembledContext()),
    );

    expect(view.context.reconstructability).toBe("exact");
    expect(view.context.reconstructabilityReason).toBe(
      "all_sources_replayable",
    );
    expect(view.context.sections[0]?.replay).toEqual({
      kind: "content_addressed_snapshot",
      store: "context.snapshots",
      snapshotDigest: SNAPSHOT_DIGEST,
      snapshotVersion: "v1",
    });
  });

  it("keeps replayable but compacted context partial until historical compactor replay is versioned", () => {
    const view = toAiGenerationContextInspectorView(
      traceRecord({}, replayableAssembledContext({ compacted: true })),
    );

    expect(view.context.reconstructability).toBe("partial");
    expect(view.context.reconstructabilityReason).toBe(
      "replay_requires_historical_compaction",
    );
  });

  it("reports partial reconstruction with incomplete revision evidence for older safe provenance", () => {
    const record = traceRecord();
    const provenance = record.contextProvenance as {
      sections: Array<{ provenance: Record<string, unknown> }>;
    };
    delete provenance.sections[0]?.provenance.revisionFingerprint;

    const view = toAiGenerationContextInspectorView(record);

    expect(view.context.reconstructability).toBe("partial");
    expect(view.context.reconstructabilityReason).toBe(
      "source_revision_evidence_incomplete",
    );
    expect(view.context.sections[0]?.revisionFingerprint).toBeNull();
  });

  it("marks legacy traces without context evidence as non-reconstructable instead of guessing", () => {
    const view = toAiGenerationContextInspectorView(
      traceRecord({ contextFingerprint: null, contextProvenance: null }),
    );

    expect(view.context).toEqual({
      fingerprint: null,
      reconstructability: "non_reconstructable",
      reconstructabilityReason: "context_evidence_missing",
      profile: null,
      maxContextTokens: null,
      estimatedTokens: null,
      observability: {
        budgetUtilizationRatio: null,
        contextToOutputTokenRatio: null,
      },
      droppedSections: [],
      sections: [],
    });
  });
});
