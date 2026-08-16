import { describe, expect, it } from "vitest";

import {
  STORY_GENERATION_CONTEXT_TOKENS,
  STORY_GENERATION_TOKEN_BUDGET,
  createStoryGenerationContextComposer,
  type ContextItem,
  type ContextSourceResult,
  type RelevantNpcItem,
} from "../../src";

function empty<T>(): Promise<ContextSourceResult<T>> {
  return Promise.resolve({ items: [], sourceRelevance: 0 });
}

describe("story relevant NPC context", () => {
  it("keeps the 5200-token ceiling while reallocating unused knowledge budget to NPCs", () => {
    expect(STORY_GENERATION_CONTEXT_TOKENS).toBe(5_200);
    expect(STORY_GENERATION_TOKEN_BUDGET.relevantNpcTokens).toBe(390);
    expect(STORY_GENERATION_TOKEN_BUDGET.knowledgeTokens).toBe(0);
    expect(
      STORY_GENERATION_TOKEN_BUDGET.safetyTokens +
        STORY_GENERATION_TOKEN_BUDGET.parentPolicyTokens +
        STORY_GENERATION_TOKEN_BUDGET.workingStoryTokens +
        STORY_GENERATION_TOKEN_BUDGET.emotionalStateTokens +
        STORY_GENERATION_TOKEN_BUDGET.longTermMemoryTokens +
        (STORY_GENERATION_TOKEN_BUDGET.relevantNpcTokens ?? 0) +
        STORY_GENERATION_TOKEN_BUDGET.knowledgeTokens +
        STORY_GENERATION_TOKEN_BUDGET.worldTokens +
        (STORY_GENERATION_TOKEN_BUDGET.originPackageTokens ?? 0),
    ).toBe(STORY_GENERATION_CONTEXT_TOKENS);
  });

  it("places provider-safe NPC text in its own bounded manifest section", async () => {
    const npcItem: ContextItem<RelevantNpcItem> = {
      id: "npc:internal-123",
      type: "relevant-npc",
      content: {
        summary: "Arin is a forest guide. Relationship tone: positive",
      },
      text: "Arin is a forest guide. Relationship tone: positive",
      sourceEngine: "profiles+npc-intelligence/canonical-npc",
      authority: 0.9,
      confidence: 0.9,
      scope: "world_truth",
      priority: 2,
      relevance: 0.9,
    };

    const composer = createStoryGenerationContextComposer({
      safetyPolicySource: { fetch: () => empty() },
      parentPolicySource: { fetch: () => empty() },
      workingStorySource: { fetch: () => empty() },
      emotionalStateSource: { fetch: () => empty() },
      longTermMemorySource: { fetch: () => empty() },
      relevantNpcSource: {
        fetch: async () => ({ items: [npcItem], sourceRelevance: 0.9 }),
      },
      knowledgeSource: { fetch: () => empty() },
      worldSource: { fetch: () => empty() },
    });

    const manifest = await composer.build({
      householdId: "household-1",
      childProfileId: "child-1",
      worldId: "world-1",
      generationIntent: "story_generation",
    });

    const section = manifest.sections.find(
      (item) => item.name === "relevant-npc",
    );
    expect(section?.items).toHaveLength(1);
    expect(section?.items[0]?.text).toContain("Arin");
    expect(section?.tokensUsed).toBeLessThanOrEqual(390);
    expect(manifest.tokenUsage.allocatedTokens).toBe(5_200);
  });
});
