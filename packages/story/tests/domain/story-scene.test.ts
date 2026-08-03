import { describe, expect, it } from "vitest";
import { StoryScene, StorySceneTransition } from "../../src/domain";
import { ValidationError } from "../../src/domain/errors";

describe("StoryScene", () => {
  it("creates scene with validated fields", () => {
    const scene = StoryScene.create({
      storyVersionId: crypto.randomUUID(),
      sceneKey: "scene-1",
      sequenceNumber: 0,
      sceneType: "narrative",
      narrativeText: "Hello world.",
      isEntryScene: true,
    });
    expect(scene.isEntry).toBe(true);
    expect(scene.sceneType).toBe("narrative");
  });

  it("rejects empty narrative text", () => {
    expect(() =>
      StoryScene.create({
        storyVersionId: crypto.randomUUID(),
        sceneKey: "scene-1",
        sequenceNumber: 0,
        sceneType: "narrative",
        narrativeText: "   ",
      }),
    ).toThrow(ValidationError);
  });
});

describe("StorySceneTransition", () => {
  it("validates transitions against scene ids", () => {
    const versionId = crypto.randomUUID();
    const a = StoryScene.create({
      storyVersionId: versionId,
      sceneKey: "a",
      sequenceNumber: 0,
      sceneType: "narrative",
      narrativeText: "A",
    });
    const b = StoryScene.create({
      storyVersionId: versionId,
      sceneKey: "b",
      sequenceNumber: 1,
      sceneType: "narrative",
      narrativeText: "B",
    });
    const t = StorySceneTransition.create({
      storyVersionId: versionId,
      fromSceneId: a.id,
      toSceneId: b.id,
      transitionType: "automatic",
    });
    expect(() =>
      StorySceneTransition.validateScopes([t], new Set([a.id]), versionId),
    ).toThrow(ValidationError);
  });
});
