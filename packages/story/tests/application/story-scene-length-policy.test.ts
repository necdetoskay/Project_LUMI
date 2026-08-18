import { describe, expect, it, vi } from "vitest";

import { StorySceneGenerationService } from "../../src/application/story-scene-generation.service";
import type { StorySceneLlmSettingsPort } from "../../src/application/story-scene-llm-settings";
import type { StoryHookState } from "../../src/domain/story-types";

function hook(): StoryHookState {
  return {
    id: "hook-length-1",
    householdId: "household-1",
    childProfileId: "child-1",
    storySessionId: "session-1",
    worldId: "world-1",
    opportunityId: "opportunity-1",
    hookType: "rumor",
    sourceNpcId: "npc-1",
    targetNpcId: null,
    payload: { claim: "A hidden lantern glows near the bridge." },
    constraints: {},
    sceneType: "narrative",
    status: "pending",
    version: 1,
    createdAt: new Date(),
    consumedAt: null,
  };
}

function settings(): StorySceneLlmSettingsPort {
  return {
    async resolveSettings() {
      return {
        apiKey: "sk-test",
        modelId: "test-model",
        temperature: 0.7,
        maxOutputTokens: 4096,
        contentBoundary: "no fear",
        ageBand: "6-8",
        locale: "tr-TR",
      };
    },
  };
}

function sceneJson(length: number): string {
  return JSON.stringify({
    sceneId: "scene-length-1",
    setting: "bridge",
    characters: ["Lumi"],
    narrative: "a".repeat(length),
    moment: "merak",
    nextPrompt: null,
    usedContinuityKeys: [],
  });
}

describe("StorySceneGenerationService narrative target", () => {
  it("renders and accepts the same custom narrative target", async () => {
    const caller = vi.fn().mockResolvedValue({
      content: sceneJson(1200),
      model: "test-model",
    });

    const result = await new StorySceneGenerationService().generateSceneFromHook({
      hook: hook(),
      settingsPort: settings(),
      narrativeTarget: {
        preset: "custom",
        minCharacters: 1100,
        maxCharacters: 1300,
      },
      callOpenRouter: caller,
      maxAttempts: 1,
    });

    expect(result.narrativeTarget).toEqual({
      preset: "custom",
      minCharacters: 1100,
      maxCharacters: 1300,
    });
    const providerInput = caller.mock.calls[0]?.[1] as {
      messages: Array<{ content: string }>;
    };
    expect(providerInput.messages[1]?.content).toContain("1100-1300");
  });

  it("rejects output outside the selected narrative target", async () => {
    const caller = vi.fn().mockResolvedValue({
      content: sceneJson(1000),
      model: "test-model",
    });

    await expect(
      new StorySceneGenerationService().generateSceneFromHook({
        hook: hook(),
        settingsPort: settings(),
        narrativeTarget: {
          preset: "custom",
          minCharacters: 1100,
          maxCharacters: 1300,
        },
        callOpenRouter: caller,
        maxAttempts: 1,
      }),
    ).rejects.toThrow(/1100-1300/);
  });
});
