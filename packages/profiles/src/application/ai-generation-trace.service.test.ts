import { describe, expect, it } from "vitest";

import type { AiGenerationTraceRecord } from "../db/schema/profile";
import {
  createAiGenerationContextTraceEvidence,
  toAiGenerationContextInspectorView,
} from "./ai-generation-trace.service";
import type { AssembledGenerationContext } from "./generation-context-assembler";

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

function traceRecord(
  overrides: Partial<AiGenerationTraceRecord> = {},
): AiGenerationTraceRecord {
  const evidence = createAiGenerationContextTraceEvidence(assembledContext());
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
  it("persists fingerprint and section-level audit metadata without context values or internal source identifiers", () => {
    const evidence = createAiGenerationContextTraceEvidence(assembledContext());
    const serialized = JSON.stringify(evidence);

    expect(evidence.contextFingerprint).toBe("a".repeat(64));
    expect(evidence.contextProvenance).toMatchObject({
      profile: "character_onboarding",
      maxContextTokens: 3_600,
      estimatedTokens: 420,
      droppedSections: ["relevant_memories"],
    });
    expect(serialized).toContain("canonical-child-profile");
    expect(serialized).toContain("dedupe-and-tail-prune-v1");
    expect(serialized).not.toContain("SECRET-CHILD-ID");
    expect(serialized).not.toContain("SECRET-SOURCE-ID");
    expect(serialized).not.toContain("SECRET-REVISION");
    expect(serialized).not.toContain("interests");
  });
});

describe("toAiGenerationContextInspectorView", () => {
  it("returns only privacy-safe audit evidence and generation metrics", () => {
    const view = toAiGenerationContextInspectorView(traceRecord());
    const serialized = JSON.stringify(view);

    expect(view.context).toMatchObject({
      fingerprint: "a".repeat(64),
      reconstructability: "audit_only",
      reconstructabilityReason: "privacy_safe_trace_evidence",
      profile: "character_onboarding",
      maxContextTokens: 3_600,
      estimatedTokens: 420,
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

  it("marks legacy traces without context evidence as unavailable instead of guessing", () => {
    const view = toAiGenerationContextInspectorView(
      traceRecord({ contextFingerprint: null, contextProvenance: null }),
    );

    expect(view.context).toEqual({
      fingerprint: null,
      reconstructability: "unavailable",
      reconstructabilityReason: "context_evidence_missing",
      profile: null,
      maxContextTokens: null,
      estimatedTokens: null,
      droppedSections: [],
      sections: [],
    });
  });
});
