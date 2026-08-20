import { describe, expect, it } from "vitest";

import {
  validateMemoryThreadGenesisSuggestion,
} from "./memory-thread-genesis.service";
import type { MemoryThreadGenesisSuggestion } from "../domain/memory-thread-genesis";

function baseSuggestion(): MemoryThreadGenesisSuggestion {
  return {
    key: "memory-thread-1",
    title: "Grounded past and open questions",
    memories: [1, 2, 3].map((index) => ({
      key: `memory-${index}`,
      summary: `Known memory ${index}`,
      kind: "experience" as const,
      visibility: "known_to_character" as const,
      originFactIds: [`fact-${index}`],
      relatedNpcIds: [],
      relatedPlaceRefs: [],
      relatedItemKeys: [],
      relatedFearIds: [],
      relatedGoalKeys: [],
      rationale: "Grounded past event.",
    })),
    threads: [
      {
        key: "thread-1",
        summary: "Why does the compass point north?",
        visibility: "known_to_character",
        initialStatus: "unresolved",
        storyPotential: "high",
        originFactIds: ["fact-2"],
        sourceQuestionIds: ["question-1"],
        sourceHookIds: [],
        relatedNpcIds: [],
        relatedPlaceRefs: [],
        relatedItemKeys: [],
        relatedFearIds: [],
        relatedGoalKeys: [],
        rationale: "Persistent optional question.",
      },
    ],
  };
}

describe("Memory Thread Genesis semantic validation", () => {
  it("accepts 3-5 character-known memory seeds and a sourced thread", () => {
    const validation = validateMemoryThreadGenesisSuggestion(baseSuggestion());
    expect(validation.valid).toBe(true);
    expect(validation.memoryCount).toBe(3);
    expect(validation.threadCount).toBe(1);
  });

  it("rejects memory candidates without origin evidence", () => {
    const candidate = baseSuggestion();
    candidate.memories[0]!.originFactIds = [];

    const validation = validateMemoryThreadGenesisSuggestion(candidate);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      "MEMORY_GENESIS_ORIGIN_FACT_REQUIRED",
    );
  });

  it("rejects an Origin Thread without question or hook provenance", () => {
    const candidate = baseSuggestion();
    candidate.threads[0]!.sourceQuestionIds = [];
    candidate.threads[0]!.sourceHookIds = [];

    const validation = validateMemoryThreadGenesisSuggestion(candidate);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      "ORIGIN_THREAD_SOURCE_REQUIRED",
    );
  });

  it("rejects memory count drift outside the 3-5 contract", () => {
    const candidate = baseSuggestion();
    candidate.memories = candidate.memories.slice(0, 2);

    const validation = validateMemoryThreadGenesisSuggestion(candidate);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      "MEMORY_GENESIS_COUNT_OUT_OF_RANGE",
    );
  });
});
