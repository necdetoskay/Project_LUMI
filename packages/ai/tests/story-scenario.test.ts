import { describe, expect, it } from "vitest";

import {
  createStoryGenerationPhase,
  createStoryGenerationScenario,
  storyNumberFromPhaseId,
  storyPhaseId,
} from "../src/test-lab/domain/story-scenario";

describe("story Test Lab scenario", () => {
  it("creates stable unique phase ids for long-horizon story runs", () => {
    const scenario = createStoryGenerationScenario(12);

    expect(scenario.key).toBe("story_generation");
    expect(scenario.phases).toHaveLength(12);
    expect(scenario.phases.map((phase) => phase.id)).toEqual([
      "story_001",
      "story_002",
      "story_003",
      "story_004",
      "story_005",
      "story_006",
      "story_007",
      "story_008",
      "story_009",
      "story_010",
      "story_011",
      "story_012",
    ]);
  });

  it("maps story numbers to and from phase ids", () => {
    expect(storyPhaseId(1)).toBe("story_001");
    expect(storyPhaseId(10)).toBe("story_010");
    expect(storyNumberFromPhaseId("story_010")).toBe(10);
    expect(storyNumberFromPhaseId("story_generation")).toBeNull();
    expect(storyNumberFromPhaseId("story_000")).toBeNull();
  });

  it("keeps every story phase production-backed and stateful", () => {
    const phase = createStoryGenerationPhase(4);

    expect(phase).toMatchObject({
      id: "story_004",
      kind: "generation",
      llmBacked: true,
      testable: true,
      productionOperation: "generateStoryCandidate",
      directions: ["story"],
      requiredStateKeys: ["storyLab.worldId", "storyLab.sourceTitle"],
      writesStateKey: "storyLab.stories.3",
    });
  });

  it("rejects invalid story numbers", () => {
    expect(() => storyPhaseId(0)).toThrow("TEST_LAB_INVALID_STORY_NUMBER");
    expect(() => storyPhaseId(1000)).toThrow(
      "TEST_LAB_INVALID_STORY_NUMBER",
    );
  });
});
