import { describe, expect, it } from "vitest";

import { ContextBuilder } from "../../src/application/context-builder";
import {
  InMemoryEmotionalStateAdapter,
  InMemoryKnowledgeAdapter,
  InMemoryLongTermMemoryAdapter,
  InMemoryParentPolicyAdapter,
  InMemorySafetyPolicyAdapter,
  InMemoryWorkingStoryAdapter,
  InMemoryWorldAdapter,
} from "../../src/adapters";
import type { TokenBudget } from "../../src/ports";
import {
  testEmotionalState,
  testKnowledge,
  testLongTermMemories,
  testParentPolicy,
  testRequest,
  testSafetyPolicy,
  testWorkingStory,
  testWorld,
} from "../fixtures/contexts";

const budget: TokenBudget = {
  totalTokens: 400,
  safetyTokens: 80,
  parentPolicyTokens: 40,
  workingStoryTokens: 120,
  emotionalStateTokens: 40,
  longTermMemoryTokens: 40,
  knowledgeTokens: 40,
  worldTokens: 5,
};

describe("ContextBuilder semantic world budget", () => {
  it("keeps critical location while truncating lower-value world details", async () => {
    const builder = new ContextBuilder(
      {
        safetyPolicySource: new InMemorySafetyPolicyAdapter(testSafetyPolicy),
        parentPolicySource: new InMemoryParentPolicyAdapter(testParentPolicy),
        workingStorySource: new InMemoryWorkingStoryAdapter(testWorkingStory),
        emotionalStateSource: new InMemoryEmotionalStateAdapter([
          testEmotionalState,
        ]),
        longTermMemorySource: new InMemoryLongTermMemoryAdapter(
          testLongTermMemories,
        ),
        knowledgeSource: new InMemoryKnowledgeAdapter(testKnowledge),
        worldSource: new InMemoryWorldAdapter(testWorld),
      },
      budget,
    );
    const manifest = await builder.build(testRequest);
    const world = manifest.sections.find((section) => section.name === "world");
    expect(world?.items.map((item) => item.id)).toContain("world:location");
    expect(world?.items.map((item) => item.id)).not.toContain(
      "world:environment",
    );
    expect(world?.tokensUsed).toBeLessThanOrEqual(budget.worldTokens);
    expect(
      manifest.findings.some(
        (finding) =>
          finding.code === "SECTION_TRUNCATED" && finding.section === "world",
      ),
    ).toBe(true);
  });
});
