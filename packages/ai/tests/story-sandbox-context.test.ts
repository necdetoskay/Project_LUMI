import { describe, expect, it } from "vitest";

import {
  appendSelectedStoryCandidate,
  buildWorkingStoryFromSandboxState,
  readStorySandboxScope,
} from "../src/test-lab/application/story-sandbox-context";
import { storyPhaseId } from "../src/test-lab/domain/story-scenario";
import type { JsonObject } from "../src/test-lab/domain/test-lab-types";

function parentState(): JsonObject {
  return {
    character: { name: "Lumi", mood: "curious" },
    world: { region: "Crystal Caves" },
    inventory: ["silver-key"],
    relationships: { Mira: "trusted-friend" },
    memories: ["found a lantern"],
    npcs: { Mira: { location: "bridge" } },
    storyLab: {
      worldId: "world-1",
      sourceFamily: "world_event",
      sourceTitle: "The bridge lights return",
      sourceTeaser: "A soft blue light appears near the old bridge.",
      characterId: "character-1",
      sourceNpcIds: ["npc-mira"],
      activeGoal: "discover the source of the lights",
      stories: [
        {
          phaseId: "story_001",
          scene: {
            narrative: "Lumi found the silver key beside the lantern.",
            moment: "Lumi decided to keep the key safe.",
          },
        },
      ],
    },
  };
}

describe("story sandbox context", () => {
  it("requires Story N to consume exactly N-1 selected stories", () => {
    expect(() =>
      readStorySandboxScope(parentState(), "story_002"),
    ).not.toThrow();
    expect(() => readStorySandboxScope(parentState(), "story_003")).toThrow(
      "TEST_LAB_STORY_LINEAGE_MISMATCH",
    );
  });

  it("projects selected story and typed sandbox state into WorkingStory", () => {
    const state = parentState();
    const scope = readStorySandboxScope(state, "story_002");
    const workingStory = buildWorkingStoryFromSandboxState(state, scope);

    expect(workingStory.playerKnownFacts.join(" ")).toContain(
      "Selected Story 1: Lumi decided to keep the key safe.",
    );
    expect(workingStory.playerKnownFacts.join(" ")).toContain("silver-key");
    expect(workingStory.playerKnownFacts.join(" ")).toContain("Mira");
    expect(
      workingStory.activeCharacterContexts[0]?.relevantMemories.join(" "),
    ).toContain("found a lantern");
    expect(
      workingStory.activeCharacterContexts[0]?.relationshipNotes.join(" "),
    ).toContain("trusted-friend");
  });

  it("appends only the new story and leaves the parent state untouched", () => {
    const state = parentState();
    const next = appendSelectedStoryCandidate({
      parentState: state,
      phaseId: "story_002",
      story: {
        phaseId: "story_002",
        scene: { moment: "The bridge lights revealed a safe path." },
      },
    });

    const originalStoryLab = state.storyLab as JsonObject;
    const nextStoryLab = next.storyLab as JsonObject;
    expect((originalStoryLab.stories as unknown[]).length).toBe(1);
    expect((nextStoryLab.stories as unknown[]).length).toBe(2);
  });

  it("supports 12 sequential selected-story transitions without mixing lineage", () => {
    let state: JsonObject = {
      character: { name: "Lumi" },
      inventory: ["silver-key"],
      npcs: { Mira: { relationship: "trusted" } },
      storyLab: {
        worldId: "world-1",
        sourceFamily: "world_event",
        sourceTitle: "The bridge lights return",
        characterId: "character-1",
        stories: [],
      },
    };

    for (let storyNumber = 1; storyNumber <= 12; storyNumber += 1) {
      const phaseId = storyPhaseId(storyNumber);
      const scope = readStorySandboxScope(state, phaseId);
      expect(scope.stories).toHaveLength(storyNumber - 1);
      state = appendSelectedStoryCandidate({
        parentState: state,
        phaseId,
        story: {
          phaseId,
          scene: { moment: `Selected continuity moment ${storyNumber}` },
        },
      });
    }

    const finalScope = readStorySandboxScope(state, "story_013");
    expect(finalScope.stories).toHaveLength(12);
    const workingStory = buildWorkingStoryFromSandboxState(state, finalScope);
    expect(workingStory.playerKnownFacts.join(" ")).toContain(
      "Selected Story 12: Selected continuity moment 12",
    );
    expect(workingStory.playerKnownFacts.join(" ")).toContain("silver-key");
    expect(workingStory.playerKnownFacts.join(" ")).toContain("Mira");
  });
});
