import { describe, expect, it } from "vitest";

import { createContextInspectorProjection } from "../../src/application";
import type { ContextManifest } from "../../src/ports";

describe("createContextInspectorProjection", () => {
  it("projects manifest provenance and budget data without creating a second source of truth", () => {
    const manifest: ContextManifest = {
      request: {
        householdId: "household-1",
        childProfileId: "child-1",
        worldId: "world-1",
        storySessionId: "story-1",
        generationIntent: "continue-story",
      },
      sections: [
        {
          name: "working-story",
          priority: 2,
          tokensUsed: 12,
          truncated: false,
          items: [
            {
              id: "working-story:mode",
              type: "working-story-mode",
              content: { ignoredByInspector: true },
              text: "Mode: reading",
              sourceEngine: "working-story",
              authority: 0.9,
              confidence: 1,
              scope: "narrative_instruction",
              priority: 1,
              relevance: 1,
            },
          ],
        },
        {
          name: "long-term-memory",
          priority: 4,
          tokensUsed: 8,
          truncated: true,
          items: [],
        },
      ],
      tokenUsage: {
        totalTokens: 100,
        allocatedTokens: 80,
        usedTokens: 20,
        remainingTokens: 80,
      },
      findings: [
        {
          code: "SECTION_TRUNCATED",
          message: "memory truncated",
          severity: "warning",
          section: "long-term-memory",
        },
      ],
      contentHash: "hash-123",
    };

    const projection = createContextInspectorProjection(manifest);

    expect(projection.contentHash).toBe("hash-123");
    expect(projection.request).toEqual(manifest.request);
    expect(projection.tokenUsage).toEqual(manifest.tokenUsage);
    expect(projection.sections[0]?.items[0]).toEqual({
      id: "working-story:mode",
      type: "working-story-mode",
      text: "Mode: reading",
      sourceEngine: "working-story",
      authority: 0.9,
      confidence: 1,
      scope: "narrative_instruction",
      priority: 1,
      relevance: 1,
    });
    expect(projection.summary).toEqual({
      sectionCount: 2,
      itemCount: 1,
      truncatedSectionCount: 1,
      warningCount: 1,
      errorCount: 0,
    });
  });
});
