import { describe, expect, it } from "vitest";

import { ContextBuilder } from "../../src/application/context-builder";
import {
  InMemoryEmotionalStateAdapter,
  InMemoryKnowledgeAdapter,
  InMemoryLongTermMemoryAdapter,
  InMemoryOriginPackageAdapter,
  InMemoryParentPolicyAdapter,
  InMemorySafetyPolicyAdapter,
  InMemoryWorldAdapter,
  InMemoryWorkingStoryAdapter,
} from "../../src/adapters";
import {
  testRequest,
  testSafetyPolicy,
  testParentPolicy,
  testWorkingStory,
  testEmotionalState,
  testLongTermMemories,
  testKnowledge,
  testWorld,
  testOriginPackage,
  testBudget,
  tightBudget,
  createLooseningParentPolicy,
  createMinimalRequest,
} from "../fixtures/contexts";

function createBuilder(
  budget = testBudget,
  overrides: Partial<{
    safetyPolicy: typeof testSafetyPolicy;
    parentPolicy: typeof testParentPolicy;
  }> = {},
) {
  return new ContextBuilder(
    {
      safetyPolicySource: new InMemorySafetyPolicyAdapter(
        overrides.safetyPolicy ?? testSafetyPolicy,
      ),
      parentPolicySource: new InMemoryParentPolicyAdapter(
        overrides.parentPolicy ?? testParentPolicy,
      ),
      workingStorySource: new InMemoryWorkingStoryAdapter(testWorkingStory),
      emotionalStateSource: new InMemoryEmotionalStateAdapter([
        testEmotionalState,
      ]),
      longTermMemorySource: new InMemoryLongTermMemoryAdapter(
        testLongTermMemories,
      ),
      knowledgeSource: new InMemoryKnowledgeAdapter(testKnowledge),
      worldSource: new InMemoryWorldAdapter(testWorld),
      originPackageSource: new InMemoryOriginPackageAdapter(testOriginPackage),
    },
    budget,
  );
}

describe("ContextBuilder", () => {
  describe("determinism", () => {
    it("produces the same manifest for the same input and snapshot", async () => {
      const builder = createBuilder();
      const request = { ...testRequest, snapshot: { seed: 42 } };

      const first = await builder.build(request);
      const second = await builder.build(request);

      expect(first.contentHash).toBe(second.contentHash);
      expect(first.sections.map((s) => s.items.map((i) => i.id))).toEqual(
        second.sections.map((s) => s.items.map((i) => i.id)),
      );
    });

    it("produces a different manifest when the snapshot changes", async () => {
      const builder = createBuilder();

      const first = await builder.build({
        ...testRequest,
        snapshot: { seed: 1 },
      });
      const second = await builder.build({
        ...testRequest,
        snapshot: { seed: 2 },
      });

      expect(first.contentHash).not.toBe(second.contentHash);
    });
  });

  describe("priority order", () => {
    it("orders sections by safety, parent policy, working story, emotional, memory, knowledge, world, origin", async () => {
      const builder = createBuilder();
      const manifest = await builder.build(testRequest);

      const names = manifest.sections.map((section) => section.name);
      expect(names).toEqual([
        "safety",
        "parent-policy",
        "working-story",
        "emotional-state",
        "long-term-memory",
        "relevant-npc",
        "knowledge",
        "world",
        "origin-package",
      ]);
    });

    it("assigns ascending priority numbers matching the required order", async () => {
      const builder = createBuilder();
      const manifest = await builder.build(testRequest);

      const priorities = manifest.sections.map((section) => section.priority);
      expect(priorities).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });
  });

  describe("token budget overflow", () => {
    it("truncates lower priority sections when budget is tight", async () => {
      const builder = createBuilder(tightBudget);
      const manifest = await builder.build(testRequest);

      expect(manifest.tokenUsage.usedTokens).toBeLessThanOrEqual(
        tightBudget.totalTokens,
      );
      expect(
        manifest.findings.some((f) => f.code === "SECTION_TRUNCATED"),
      ).toBe(true);
    });

    it("keeps safety section intact even when other sections truncate", async () => {
      const builder = createBuilder(tightBudget);
      const manifest = await builder.build(testRequest);

      const safetySection = manifest.sections.find((s) => s.name === "safety");
      expect(safetySection).toBeDefined();
      expect(safetySection!.items.length).toBeGreaterThan(0);
      expect(safetySection!.tokensUsed).toBeLessThanOrEqual(
        tightBudget.safetyTokens,
      );
    });
  });

  describe("missing source", () => {
    it("records a finding when a required source fails", async () => {
      const failingBuilder = new ContextBuilder(
        {
          safetyPolicySource: {
            fetch: async () => {
              throw new Error("safety service unavailable");
            },
          },
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
        testBudget,
      );

      const manifest = await failingBuilder.build(testRequest);

      expect(
        manifest.findings.some(
          (f) => f.code === "SOURCE_FETCH_FAILED" && f.section === "safety",
        ),
      ).toBe(true);
      expect(
        manifest.sections.find((s) => s.name === "safety")!.items,
      ).toHaveLength(0);
    });

    it("records a finding when parent policy is empty", async () => {
      const builder = new ContextBuilder(
        {
          safetyPolicySource: new InMemorySafetyPolicyAdapter(testSafetyPolicy),
          parentPolicySource: {
            fetch: async () => ({ items: [], sourceRelevance: 0 }),
          },
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
        testBudget,
      );

      const manifest = await builder.build(testRequest);

      expect(
        manifest.findings.some((f) => f.code === "MISSING_PARENT_POLICY"),
      ).toBe(true);
    });
  });

  describe("safety override", () => {
    it("sanitizes a parent policy that tries to loosen safety rules", async () => {
      const builder = createBuilder(testBudget, {
        parentPolicy: createLooseningParentPolicy(),
      });
      const manifest = await builder.build(testRequest);

      const parentSection = manifest.sections.find(
        (s) => s.name === "parent-policy",
      );
      expect(parentSection).toBeDefined();
      const policy = parentSection!.items[0]?.content as {
        contentBoundary: string;
        requireParentApprovalForAi: boolean;
      };
      expect(policy.contentBoundary).toBe("strict");
      expect(policy.requireParentApprovalForAi).toBe(true);
      expect(
        manifest.findings.some(
          (f) => f.code === "POLICY_LOOSENS_CONTENT_BOUNDARY",
        ),
      ).toBe(true);
    });

    it("keeps a compliant parent policy unchanged", async () => {
      const builder = createBuilder(testBudget, {
        parentPolicy: testParentPolicy,
      });
      const manifest = await builder.build(testRequest);

      const parentSection = manifest.sections.find(
        (s) => s.name === "parent-policy",
      );
      expect(parentSection).toBeDefined();
      const policy = parentSection!.items[0]?.content as {
        contentBoundary: string;
        maxDailyStories: number;
      };
      expect(policy.contentBoundary).toBe("strict");
      expect(policy.maxDailyStories).toBe(5);
      expect(
        manifest.findings.some(
          (f) => f.section === "parent-policy" && f.severity === "warning",
        ),
      ).toBe(false);
    });
  });

  describe("validation", () => {
    it("rejects an invalid request", async () => {
      const builder = createBuilder();
      await expect(
        builder.build({ ...testRequest, householdId: "" }),
      ).rejects.toThrow();
    });

    it("accepts a minimal valid request", async () => {
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
        testBudget,
      );

      const manifest = await builder.build(createMinimalRequest());
      expect(manifest.sections.length).toBe(9);
      expect(manifest.tokenUsage.usedTokens).toBeLessThanOrEqual(
        testBudget.totalTokens,
      );
    });
  });
});
