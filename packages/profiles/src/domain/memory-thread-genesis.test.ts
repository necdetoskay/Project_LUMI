import { describe, expect, it } from "vitest";

import {
  createMemoryThreadGenesisManifest,
  getOriginThreadPlanningWeight,
  inspectMemoryThreadQuality,
  recordOriginThreadUsage,
  transitionOriginThread,
  validateMemoryThreadGenesisManifest,
  type MemoryThreadGenesisSuggestion,
} from "./memory-thread-genesis";

function suggestion(): MemoryThreadGenesisSuggestion {
  return {
    key: "grounded-past",
    title: "Grounded past",
    memories: [
      {
        key: "storm-path",
        summary:
          "Miro once lost the path during a storm and found the bridge lights.",
        kind: "experience",
        visibility: "known_to_character",
        originFactIds: ["fact-storm"],
        relatedNpcIds: ["npc-lina"],
        relatedPlaceRefs: ["place-bridge"],
        relatedItemKeys: [],
        relatedFearIds: ["fear-storms"],
        relatedGoalKeys: [],
        rationale: "Concrete formative event.",
      },
      {
        key: "compass-gift",
        summary: "His grandfather gave him an old brass compass.",
        kind: "experience",
        visibility: "known_to_character",
        originFactIds: ["fact-compass"],
        relatedNpcIds: ["npc-grandfather"],
        relatedPlaceRefs: [],
        relatedItemKeys: ["genesis_compass"],
        relatedFearIds: [],
        relatedGoalKeys: ["goal-learn-compass"],
        rationale: "Relationship and item memory.",
      },
      {
        key: "river-friend",
        summary:
          "Miro first met Lina while collecting smooth stones by the river.",
        kind: "experience",
        visibility: "user_visible",
        originFactIds: ["fact-lina"],
        relatedNpcIds: ["npc-lina"],
        relatedPlaceRefs: ["place-river"],
        relatedItemKeys: [],
        relatedFearIds: [],
        relatedGoalKeys: [],
        rationale: "Warm social anchor.",
      },
    ],
    threads: [
      {
        key: "compass-north",
        summary:
          "Why does the old compass sometimes point toward the northern mountains?",
        visibility: "known_to_character",
        initialStatus: "unresolved",
        storyPotential: "high",
        originFactIds: ["fact-compass"],
        sourceQuestionIds: ["question-compass"],
        sourceHookIds: ["hook-north"],
        relatedNpcIds: ["npc-grandfather"],
        relatedPlaceRefs: ["place-mountains"],
        relatedItemKeys: ["genesis_compass"],
        relatedFearIds: [],
        relatedGoalKeys: ["goal-learn-compass"],
        rationale: "Persistent optional mystery.",
      },
      {
        key: "caregiver-secret",
        summary:
          "The system knows there is a hidden reason the northern forest is forbidden.",
        visibility: "system_only",
        initialStatus: "dormant",
        storyPotential: "medium",
        originFactIds: ["fact-forest-rule"],
        sourceQuestionIds: ["question-forest"],
        sourceHookIds: [],
        relatedNpcIds: ["npc-caregiver"],
        relatedPlaceRefs: ["place-north-forest"],
        relatedItemKeys: [],
        relatedFearIds: [],
        relatedGoalKeys: [],
        rationale: "Hidden knowledge for later discovery.",
      },
    ],
  };
}

const references = {
  originFactIds: [
    "fact-storm",
    "fact-compass",
    "fact-lina",
    "fact-forest-rule",
  ],
  originQuestionIds: ["question-compass", "question-forest"],
  originHookIds: ["hook-north"],
  socialNpcIds: ["npc-lina", "npc-grandfather", "npc-caregiver"],
  placeRefs: [
    "place-bridge",
    "place-river",
    "place-mountains",
    "place-north-forest",
  ],
  inventoryItemKeys: ["genesis_compass"],
  fearIds: ["fear-storms"],
  goalKeys: ["goal-learn-compass"],
};

describe("MemoryThreadGenesis", () => {
  it("creates stable structured memory and thread ids with origin provenance", () => {
    const first = createMemoryThreadGenesisManifest({
      characterId: "character-1",
      seed: "seed-1",
      suggestion: suggestion(),
    });
    const second = createMemoryThreadGenesisManifest({
      characterId: "character-1",
      seed: "seed-1",
      suggestion: suggestion(),
    });

    expect(first).toEqual(second);
    expect(first.memories).toHaveLength(3);
    expect(first.threads[0]?.potential).toBe(0.9);
    expect(first.threads[0]?.provenance.source).toBe("origin");
    expect(first.threads[0]?.usage.activationCount).toBe(0);
  });

  it("validates canonical references and the 3-5 memory contract", () => {
    const manifest = createMemoryThreadGenesisManifest({
      characterId: "character-1",
      seed: "seed-1",
      suggestion: suggestion(),
    });
    const issues = validateMemoryThreadGenesisManifest({
      manifest,
      references,
    });
    expect(issues.filter((issue) => issue.severity === "error")).toEqual([]);

    manifest.memories[0]!.relatedNpcIds = ["missing-npc"];
    const broken = validateMemoryThreadGenesisManifest({
      manifest,
      references,
    });
    expect(
      broken.some((issue) => issue.code === "MEMORY_THREAD_NPC_REF_MISSING"),
    ).toBe(true);
  });

  it("throttles repeated thread use without making the thread mandatory", () => {
    const manifest = createMemoryThreadGenesisManifest({
      characterId: "character-1",
      seed: "seed-1",
      suggestion: suggestion(),
    });
    const thread = manifest.threads[0]!;
    const baseWeight = getOriginThreadPlanningWeight(thread, []);
    const repeatedWeight = getOriginThreadPlanningWeight(thread, [
      thread.candidateId,
      thread.candidateId,
    ]);

    expect(baseWeight).toBeGreaterThan(repeatedWeight);
    expect(repeatedWeight).toBeGreaterThan(0);

    const used = recordOriginThreadUsage(thread, {
      storyId: "story-1",
      usedAt: "2026-08-20T00:00:00.000Z",
    });
    expect(used.usage.activationCount).toBe(1);
    expect(
      recordOriginThreadUsage(used, {
        storyId: "story-1",
        usedAt: "2026-08-20T00:05:00.000Z",
      }),
    ).toEqual(used);
  });

  it("updates thread resolution from story outcome evidence and preserves history", () => {
    const manifest = createMemoryThreadGenesisManifest({
      characterId: "character-1",
      seed: "seed-1",
      suggestion: suggestion(),
    });
    const thread = manifest.threads[0]!;
    const active = transitionOriginThread(thread, {
      toStatus: "active",
      storyId: "story-1",
      outcomeId: "outcome-1",
      evidenceRefs: ["scene-3"],
      changedAt: "2026-08-20T00:00:00.000Z",
    });
    const partial = transitionOriginThread(active, {
      toStatus: "partially_resolved",
      storyId: "story-2",
      outcomeId: "outcome-2",
      evidenceRefs: ["scene-6"],
      changedAt: "2026-08-21T00:00:00.000Z",
    });

    expect(partial.status).toBe("partially_resolved");
    expect(partial.history).toHaveLength(2);
    expect(() =>
      transitionOriginThread(partial, {
        toStatus: "dormant",
        storyId: "story-3",
        outcomeId: "outcome-3",
        evidenceRefs: [],
        changedAt: "2026-08-22T00:00:00.000Z",
      }),
    ).toThrow("ORIGIN_THREAD_INVALID_TRANSITION");
  });

  it("reports future-story yield and semantic inspection signals", () => {
    const manifest = createMemoryThreadGenesisManifest({
      characterId: "character-1",
      seed: "seed-1",
      suggestion: suggestion(),
    });
    const quality = inspectMemoryThreadQuality(manifest);
    expect(quality.futureStoryYield).toBeGreaterThan(0.5);
    expect(quality.openThreadRatio).toBe(1);
  });
});
