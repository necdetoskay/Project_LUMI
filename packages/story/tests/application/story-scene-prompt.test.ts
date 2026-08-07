import { describe, expect, it } from "vitest";
import { buildStoryScenePrompt } from "../../src/application/story-scene-prompt";
import {
  parseAndValidateSceneOutput,
  SCENE_NARRATIVE_MAX,
} from "../../src/application/story-scene-output";
import { buildHookSceneBrief } from "../../src/domain/hook-scene-brief";
import type { StoryHookState } from "../../src/domain/story-types";

function makeBrief(payload: Record<string, unknown>) {
  const hook: StoryHookState = {
    id: "hook-1",
    householdId: "h",
    childProfileId: "c",
    storySessionId: "s",
    worldId: "w",
    opportunityId: "o",
    hookType: "rumor",
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
  return buildHookSceneBrief(hook);
}

describe("buildStoryScenePrompt", () => {
  it("is deterministic for a fixed input", () => {
    const brief = makeBrief({ claim: "moon is made of cheese" });
    const input = {
      brief,
      contentBoundary: "no fear",
      ageBand: "6-8",
      locale: "tr-TR",
      generationNonce: "nonce-1",
    };
    const a = buildStoryScenePrompt(input);
    const b = buildStoryScenePrompt(input);
    expect(a).toBe(b);
  });

  it("embeds the claim, boundary, age band, and JSON schema", () => {
    const prompt = buildStoryScenePrompt({
      brief: makeBrief({ claim: "moon is made of cheese" }),
      contentBoundary: "no fear",
      ageBand: "6-8",
      locale: "tr-TR",
      generationNonce: "nonce-1",
    });
    expect(prompt).toContain("moon is made of cheese");
    expect(prompt).toContain("no fear");
    expect(prompt).toContain("6-8");
    expect(prompt).toContain('"narrative"');
    expect(prompt).toContain("narrative"); // scene type for rumor
    expect(prompt).toContain("nonce-1");
  });

  it("includes hook-specific detail lines", () => {
    const prompt = buildStoryScenePrompt({
      brief: makeBrief({ itemId: "golden-compass" }),
      contentBoundary: "b",
      ageBand: "6-8",
      locale: "tr-TR",
      generationNonce: "n",
    });
    expect(prompt).toContain("golden-compass");
  });
});

describe("parseAndValidateSceneOutput", () => {
  it("parses valid scene output", () => {
    const raw = JSON.stringify({
      sceneId: "scene-1",
      setting: "orman kenari",
      characters: ["Lumi", "Mira"],
      narrative: "Lumi ormanin kenarinda parlayan bir isik gordu.",
      moment: "merak ve umut anı",
      nextPrompt: "Isigin kaynagini arastir",
    });
    const result = parseAndValidateSceneOutput(raw);
    expect(result.errors).toHaveLength(0);
    expect(result.scene).not.toBeNull();
    expect(result.scene!.characters).toEqual(["Lumi", "Mira"]);
    expect(result.scene!.narrative.length).toBeLessThan(SCENE_NARRATIVE_MAX);
  });

  it("tolerates fenced JSON", () => {
    const raw =
      '```json\n{"sceneId":"s","setting":"x","characters":["A"],"narrative":"n","moment":"m"}\n```';
    const result = parseAndValidateSceneOutput(raw);
    expect(result.errors).toHaveLength(0);
    expect(result.scene!.sceneId).toBe("s");
  });

  it("collects errors for missing required fields", () => {
    const result = parseAndValidateSceneOutput(
      JSON.stringify({ sceneId: "s" }),
    );
    expect(result.scene).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects narrative exceeding the cap", () => {
    const result = parseAndValidateSceneOutput(
      JSON.stringify({
        sceneId: "s",
        setting: "x",
        characters: ["A"],
        narrative: "n".repeat(SCENE_NARRATIVE_MAX + 1),
        moment: "m",
      }),
    );
    expect(result.scene).toBeNull();
    expect(result.errors.some((e) => e.includes("narrative"))).toBe(true);
  });

  it("returns an error for non-JSON output", () => {
    const result = parseAndValidateSceneOutput("sorry, no json");
    expect(result.scene).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
