import { describe, expect, it } from "vitest";

import { createAiGenerationContextTraceEvidence } from "./ai-generation-trace.service";
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
        section: "child_profile",
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
          reason: "profile_context",
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
