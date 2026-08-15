import type { ContextManifest, StoryGenerationContextComposer } from "@lumi/context";
import { describe, expect, it, vi } from "vitest";

import { StorySceneGenerationService } from "../../src/application/story-scene-generation.service";
import type { StorySceneLlmSettingsPort } from "../../src/application/story-scene-llm-settings";
import type { StoryHookState } from "../../src/domain/story-types";

function makeHook(): StoryHookState {
  return {
    id: "hook-context-1",
    householdId: "house-1",
    childProfileId: "child-1",
    storySessionId: "session-1",
    worldId: "world-1",
    opportunityId: "opportunity-1",
    hookType: "rumor",
    sourceNpcId: "npc-1",
    targetNpcId: null,
    payload: { claim: "Kristal magaranin icinden mavi bir isik geliyor." },
    constraints: {},
    sceneType: "narrative",
    status: "pending",
    version: 1,
    createdAt: new Date("2026-08-15T10:00:00Z"),
    consumedAt: null,
  };
}

function makeManifest(): ContextManifest {
  return {
    request: {
      householdId: "house-1",
      childProfileId: "child-1",
      worldId: "world-1",
      generationIntent: "story_generation",
      focalCharacterId: "character-1",
    },
    sections: [
      {
        name: "safety_policy",
        priority: 0,
        tokensUsed: 20,
        truncated: false,
        items: [
          {
            id: "safety-1",
            type: "safety_policy",
            content: {},
            text: "Korkutucu ve siddet iceren sahneler olusturma.",
            sourceEngine: "policy",
            authority: 1,
            confidence: 1,
            scope: "narrative_instruction",
            priority: 0,
            relevance: 1,
          },
        ],
      },
      {
        name: "long_term_memory",
        priority: 3,
        tokensUsed: 25,
        truncated: false,
        items: [
          {
            id: "memory-1",
            type: "canonical_memory",
            content: {},
            text: "Lumi daha once kristal magarada Mira ile parlayan bir anahtar buldu.",
            sourceEngine: "canonical-memory",
            authority: 0.9,
            confidence: 0.95,
            scope: "character_belief",
            priority: 3,
            relevance: 0.9,
          },
        ],
      },
      {
        name: "world",
        priority: 4,
        tokensUsed: 20,
        truncated: false,
        items: [
          {
            id: "world-event-1",
            type: "world_event",
            content: {},
            text: "Kristal magaranin kuzey gecidi son firtinadan sonra kapandi.",
            sourceEngine: "world-event-store",
            authority: 1,
            confidence: 1,
            scope: "world_truth",
            priority: 4,
            relevance: 0.8,
          },
        ],
      },
    ],
    tokenUsage: {
      totalTokens: 5200,
      allocatedTokens: 5200,
      usedTokens: 65,
      remainingTokens: 5135,
    },
    findings: [],
    contentHash: "ctx-hash-123",
  };
}

const settingsPort: StorySceneLlmSettingsPort = {
  async resolveSettings() {
    return {
      apiKey: "sk-test",
      modelId: "test-model",
      temperature: 0.7,
      maxOutputTokens: 2048,
      contentBoundary: "strict",
      ageBand: "6-8",
      locale: "tr-TR",
    };
  },
};

describe("story generation canonical context integration", () => {
  it("injects assembled memory/world/policy context into the real LLM call", async () => {
    const manifest = makeManifest();
    const build = vi.fn().mockResolvedValue(manifest);
    const contextComposer = { build } as unknown as StoryGenerationContextComposer;
    const caller = vi.fn().mockResolvedValue({
      model: "test-model",
      content: JSON.stringify({
        sceneId: "scene-context-1",
        setting: "Kristal magara girisi",
        characters: ["Lumi"],
        narrative: "Lumi eski anahtari hatirladi ve kapali kuzey gecidinden uzak durdu.",
        moment: "Lumi dikkatli ve merakliydi.",
        nextPrompt: null,
        usedContinuityKeys: [],
      }),
    });

    const result = await new StorySceneGenerationService().generateSceneFromHook({
      hook: makeHook(),
      settingsPort,
      contextComposer,
      characterId: "character-1",
      sceneFocus: "Kristal magaradaki mavi isigin kaynagini arastir.",
      callOpenRouter: caller,
    });

    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "house-1",
        childProfileId: "child-1",
        worldId: "world-1",
        focalCharacterId: "character-1",
        sceneFocus: "Kristal magaradaki mavi isigin kaynagini arastir.",
      }),
    );

    const prompt = (caller.mock.calls[0]?.[1] as { messages: { content: string }[] })
      .messages[1]?.content;
    expect(prompt).toContain(
      "Lumi daha once kristal magarada Mira ile parlayan bir anahtar buldu.",
    );
    expect(prompt).toContain(
      "Kristal magaranin kuzey gecidi son firtinadan sonra kapandi.",
    );
    expect(prompt).toContain("Korkutucu ve siddet iceren sahneler olusturma.");
    expect(prompt).toContain("ctx-hash-123");
    expect(result.contextManifest).toBe(manifest);
  });

  it("assembles context once and reuses the same manifest across LLM retries", async () => {
    const manifest = makeManifest();
    const build = vi.fn().mockResolvedValue(manifest);
    const contextComposer = { build } as unknown as StoryGenerationContextComposer;
    const caller = vi
      .fn()
      .mockResolvedValueOnce({ model: "test-model", content: "invalid-json" })
      .mockResolvedValueOnce({
        model: "test-model",
        content: JSON.stringify({
          sceneId: "scene-context-2",
          setting: "Kristal magara girisi",
          characters: ["Lumi"],
          narrative: "Lumi parlayan anahtari hatirladi.",
          moment: "Merakli bir an.",
          nextPrompt: null,
          usedContinuityKeys: [],
        }),
      });

    const result = await new StorySceneGenerationService().generateSceneFromHook({
      hook: makeHook(),
      settingsPort,
      contextComposer,
      characterId: "character-1",
      callOpenRouter: caller,
      maxAttempts: 2,
    });

    expect(build).toHaveBeenCalledTimes(1);
    expect(caller).toHaveBeenCalledTimes(2);
    const firstPrompt = (caller.mock.calls[0]?.[1] as { messages: { content: string }[] })
      .messages[1]?.content;
    const secondPrompt = (caller.mock.calls[1]?.[1] as { messages: { content: string }[] })
      .messages[1]?.content;
    expect(firstPrompt).toContain("ctx-hash-123");
    expect(secondPrompt).toContain("ctx-hash-123");
    expect(result.contextManifest?.contentHash).toBe("ctx-hash-123");
  });
});
