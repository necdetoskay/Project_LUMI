import { describe, expect, it } from "vitest";

import { createMemoryThreadGenesisManifest } from "../domain/memory-thread-genesis";
import { projectMemoryThreadGenesisContext } from "./memory-thread-genesis-context-projection";

describe("Memory Thread Genesis context projection", () => {
  it("never leaks system-only threads into character-visible context", () => {
    const manifest = createMemoryThreadGenesisManifest({
      characterId: "character-1",
      seed: "seed-1",
      suggestion: {
        key: "candidate",
        title: "Candidate",
        memories: [
          {
            key: "memory-1",
            summary: "A warm afternoon by the river.",
            kind: "experience",
            visibility: "known_to_character",
            originFactIds: ["fact-1"],
            relatedNpcIds: [],
            relatedPlaceRefs: [],
            relatedItemKeys: [],
            relatedFearIds: [],
            relatedGoalKeys: [],
            rationale: "Known past event.",
          },
          {
            key: "memory-2",
            summary: "Receiving a blue stone from a friend.",
            kind: "experience",
            visibility: "known_to_character",
            originFactIds: ["fact-2"],
            relatedNpcIds: [],
            relatedPlaceRefs: [],
            relatedItemKeys: [],
            relatedFearIds: [],
            relatedGoalKeys: [],
            rationale: "Known past event.",
          },
          {
            key: "memory-3",
            summary: "Learning the old trail home.",
            kind: "knowledge",
            visibility: "user_visible",
            originFactIds: ["fact-3"],
            relatedNpcIds: [],
            relatedPlaceRefs: [],
            relatedItemKeys: [],
            relatedFearIds: [],
            relatedGoalKeys: [],
            rationale: "Known past event.",
          },
        ],
        threads: [
          {
            key: "visible-thread",
            summary: "Why does the stone glow near the river?",
            visibility: "known_to_character",
            initialStatus: "unresolved",
            storyPotential: "medium",
            originFactIds: ["fact-2"],
            sourceQuestionIds: ["question-1"],
            sourceHookIds: [],
            relatedNpcIds: [],
            relatedPlaceRefs: [],
            relatedItemKeys: [],
            relatedFearIds: [],
            relatedGoalKeys: [],
            rationale: "Character knows the question.",
          },
          {
            key: "hidden-thread",
            summary: "The caregiver hid the stone's real origin.",
            visibility: "system_only",
            initialStatus: "dormant",
            storyPotential: "high",
            originFactIds: ["fact-4"],
            sourceQuestionIds: ["question-2"],
            sourceHookIds: [],
            relatedNpcIds: [],
            relatedPlaceRefs: [],
            relatedItemKeys: [],
            relatedFearIds: [],
            relatedGoalKeys: [],
            rationale: "Hidden future discovery.",
          },
        ],
      },
    });

    const projection = projectMemoryThreadGenesisContext(manifest);

    expect(projection.characterVisible.threads).toHaveLength(1);
    expect(projection.characterVisible.threads[0]?.key).toBe("visible-thread");
    expect(
      projection.planner.threads.map((entry) => entry.thread.key).sort(),
    ).toEqual(["hidden-thread", "visible-thread"]);
  });

  it("reduces planner weight for recently used threads", () => {
    const manifest = createMemoryThreadGenesisManifest({
      characterId: "character-1",
      seed: "seed-1",
      suggestion: {
        key: "candidate",
        title: "Candidate",
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
          rationale: "Known past event.",
        })),
        threads: [
          {
            key: "thread-a",
            summary: "Question A",
            visibility: "known_to_character",
            initialStatus: "unresolved",
            storyPotential: "high",
            originFactIds: ["fact-1"],
            sourceQuestionIds: ["question-a"],
            sourceHookIds: [],
            relatedNpcIds: [],
            relatedPlaceRefs: [],
            relatedItemKeys: [],
            relatedFearIds: [],
            relatedGoalKeys: [],
            rationale: "A",
          },
          {
            key: "thread-b",
            summary: "Question B",
            visibility: "known_to_character",
            initialStatus: "unresolved",
            storyPotential: "medium",
            originFactIds: ["fact-2"],
            sourceQuestionIds: ["question-b"],
            sourceHookIds: [],
            relatedNpcIds: [],
            relatedPlaceRefs: [],
            relatedItemKeys: [],
            relatedFearIds: [],
            relatedGoalKeys: [],
            rationale: "B",
          },
        ],
      },
    });
    const threadA = manifest.threads.find((thread) => thread.key === "thread-a")!;
    const projection = projectMemoryThreadGenesisContext(manifest, [
      threadA.candidateId,
      threadA.candidateId,
    ]);

    expect(projection.planner.threads[0]?.thread.key).toBe("thread-b");
  });
});
