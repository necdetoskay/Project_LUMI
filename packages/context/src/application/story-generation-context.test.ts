import { describe, expect, it } from "vitest";

import { createContextInspectorProjection } from "./context-inspector";
import {
  SAGA_STORY_CONTEXT_TOKENS,
  appendSagaContext,
  sagaStoryContextToItems,
  type SagaStoryContext,
} from "./story-generation-context";
import type { ContextManifest } from "../ports";

const saga: SagaStoryContext = {
  centralQuestion: "Sessiz sinyal nereden geliyor?",
  longTermDesire: "Kaynağını anlayıp dünyadaki yerini bulmak",
  stakes: "Yanlış yorumlanırsa yeni dostluklar kaybolabilir.",
  knownFacts: ["Sinyal yalnızca geceleri duyuluyor."],
  currentBeliefs: ["Sinyal yakındaki istasyondan geliyor olabilir."],
  revealedClues: ["İlk anten aynı ritmi kaydetti."],
  unresolvedQuestions: ["Sinyali kim gönderiyor?"],
  revealStage: 1,
};

function baseManifest(): ContextManifest {
  return {
    request: {
      householdId: "household",
      childProfileId: "child",
      worldId: "world",
      generationIntent: "story_generation",
      focalCharacterId: "character",
    },
    sections: [],
    tokenUsage: {
      totalTokens: 5_200,
      allocatedTokens: 4_810,
      usedTokens: 0,
      remainingTokens: 5_200,
    },
    findings: [],
    contentHash: "base-hash",
  };
}

describe("story generation saga context", () => {
  it("adds an independently budgeted saga section visible to Context Inspector", () => {
    const manifest = appendSagaContext(baseManifest(), saga);
    const inspector = createContextInspectorProjection(manifest);
    const sagaSection = inspector.sections.find(
      (section) => section.name === "saga",
    );

    expect(sagaSection).toBeDefined();
    expect(sagaSection?.itemCount).toBe(3);
    expect(sagaSection?.tokensUsed).toBeLessThanOrEqual(
      SAGA_STORY_CONTEXT_TOKENS,
    );
    expect(manifest.tokenUsage.allocatedTokens).toBe(5_200);
  });

  it("never serializes hidden truth fields even when an untrusted caller supplies extras", () => {
    const unsafe = {
      ...saga,
      deepTruth: "SECRET-DEEP-TRUTH",
      forbiddenEarlyReveals: ["SECRET-FORBIDDEN-REVEAL"],
      hiddenForces: ["SECRET-HIDDEN-FORCE"],
    } as SagaStoryContext;
    const serialized = sagaStoryContextToItems(unsafe)
      .map((item) => item.text)
      .join("\n");

    expect(serialized).not.toContain("SECRET-DEEP-TRUTH");
    expect(serialized).not.toContain("SECRET-FORBIDDEN-REVEAL");
    expect(serialized).not.toContain("SECRET-HIDDEN-FORCE");
    expect(serialized).toContain("İlk anten aynı ritmi kaydetti.");
  });
});
