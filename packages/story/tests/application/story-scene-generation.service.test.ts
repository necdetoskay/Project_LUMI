import { describe, expect, it, vi } from "vitest";
import type { StoryContinuityContextPort } from "../../src/application/story-continuity-context";
import { StorySceneGenerationService } from "../../src/application/story-scene-generation.service";
import type { StorySceneLlmSettingsPort } from "../../src/application/story-scene-llm-settings";
import {
  LlmConfigError,
  LlmGenerationError,
} from "../../src/application/story-scene-llm-settings";
import type { StoryHookState } from "../../src/domain/story-types";

function makeHook(
  hookType: string,
  payload: Record<string, unknown>,
): StoryHookState {
  return {
    id: "hook-1",
    householdId: "h",
    childProfileId: "c",
    storySessionId: "s",
    worldId: "w",
    opportunityId: "o",
    hookType: hookType as StoryHookState["hookType"],
    sourceNpcId: "npc-1",
    targetNpcId: null,
    payload,
    constraints: {},
    sceneType: "narrative",
    status: "pending",
    version: 1,
    createdAt: new Date(),
    consumedAt: null,
  };
}

function fakePort(
  overrides: Partial<{
    apiKey: string;
    modelId: string;
    temperature: number;
    maxOutputTokens: number;
    contentBoundary: string;
    ageBand: string;
    locale: string;
  }> = {},
): StorySceneLlmSettingsPort {
  return {
    async resolveSettings() {
      return {
        apiKey: "sk-test",
        modelId: "test-model",
        temperature: 0.7,
        maxOutputTokens: 2048,
        contentBoundary: "no fear",
        ageBand: "6-8",
        locale: "tr-TR",
        ...overrides,
      };
    },
  };
}

function validSceneJson(): string {
  return JSON.stringify({
    sceneId: "scene-1",
    setting: "orman kenari",
    characters: ["Lumi"],
    narrative: "Lumi parlayan bir isik gordu ve yanina gitti.",
    moment: "merak anı",
    nextPrompt: null,
  });
}

describe("StorySceneGenerationService", () => {
  it("generates a validated scene from a rumor hook", async () => {
    const caller = vi.fn().mockResolvedValue({
      content: validSceneJson(),
      model: "test-model",
    });
    const service = new StorySceneGenerationService();

    const result = await service.generateSceneFromHook({
      hook: makeHook("rumor", { claim: "moon is made of cheese" }),
      settingsPort: fakePort(),
      callOpenRouter: caller,
    });

    expect(result.scene.narrative).toContain("isik");
    expect(result.scene.characters).toEqual(["Lumi"]);
    expect(result.attempt).toBe(1);
    expect(caller).toHaveBeenCalledTimes(1);
    const call = caller.mock.calls[0] as unknown as [
      string,
      { model: string; messages: { role: string; content: string }[] },
    ];
    expect(call[0]).toBe("sk-test");
    expect(call[1].model).toBe("test-model");
    expect(call[1].messages[1]?.content).toContain("moon is made of cheese");
  });

  it("loads household/world-scoped continuity and injects it into the prompt", async () => {
    const resolveContext = vi.fn().mockResolvedValue({
      facts: [
        {
          key: "bridge-lights-before-storm",
          summary: "Bora, kopru isiklari soylentisini Mira'dan duydu.",
          source: "Mira",
        },
      ],
    });
    const continuityPort: StoryContinuityContextPort = { resolveContext };
    const caller = vi.fn().mockResolvedValue({
      content: validSceneJson(),
      model: "test-model",
    });
    const service = new StorySceneGenerationService();

    await service.generateSceneFromHook({
      hook: makeHook("rumor", { claim: "another hook" }),
      settingsPort: fakePort(),
      continuityPort,
      characterId: "arin",
      callOpenRouter: caller,
    });

    expect(resolveContext).toHaveBeenCalledWith({
      householdId: "h",
      worldId: "w",
      childProfileId: "c",
      characterId: "arin",
      npcIds: ["npc-1"],
    });
    const call = caller.mock.calls[0] as unknown as [
      string,
      { messages: { content: string }[] },
    ];
    expect(call[1].messages[1]?.content).toContain(
      "Bora, kopru isiklari soylentisini Mira'dan duydu.",
    );
    expect(call[1].messages[1]?.content).toContain("kaynak: Mira");
  });

  it("retries with a fresh nonce when output is invalid, then fails", async () => {
    const caller = vi
      .fn()
      .mockResolvedValue({ content: "not json at all", model: "m" });
    const service = new StorySceneGenerationService();

    await expect(
      service.generateSceneFromHook({
        hook: makeHook("gift", { itemId: "compass" }),
        settingsPort: fakePort(),
        callOpenRouter: caller,
        maxAttempts: 2,
      }),
    ).rejects.toBeInstanceOf(LlmGenerationError);

    expect(caller).toHaveBeenCalledTimes(2);
    const nonces = caller.mock.calls.map(
      (c) => (c[1] as { messages: { content: string }[] }).messages[1]?.content,
    );
    expect(nonces[0]).not.toBe(nonces[1]);
  });

  it("succeeds on the second attempt after invalid output", async () => {
    const caller = vi
      .fn()
      .mockResolvedValueOnce({ content: "bad", model: "m" })
      .mockResolvedValueOnce({ content: validSceneJson(), model: "m" });
    const service = new StorySceneGenerationService();

    const result = await service.generateSceneFromHook({
      hook: makeHook("quest_seed", { factId: "lost-letter" }),
      settingsPort: fakePort(),
      callOpenRouter: caller,
      maxAttempts: 2,
    });

    expect(result.attempt).toBe(2);
    expect(result.scene).not.toBeNull();
  });

  it("throws LlmConfigError when the caller is not configured", async () => {
    const service = new StorySceneGenerationService();
    await expect(
      service.generateSceneFromHook({
        hook: makeHook("rumor", {}),
        settingsPort: fakePort(),
      }),
    ).rejects.toBeInstanceOf(LlmConfigError);
  });

  it("wraps provider failures in LlmGenerationError", async () => {
    const caller = vi.fn().mockRejectedValue(new Error("network down"));
    const service = new StorySceneGenerationService();
    await expect(
      service.generateSceneFromHook({
        hook: makeHook("rumor", {}),
        settingsPort: fakePort(),
        callOpenRouter: caller,
      }),
    ).rejects.toMatchObject({ name: "LlmGenerationError" });
  });
});
