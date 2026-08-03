import { describe, expect, it } from "vitest";
import { StoryVersion, StoryScene, StorySceneTransition } from "../../src/domain";
import { ValidationError } from "../../src/domain/errors";

describe("StoryVersion", () => {
  const definitionId = crypto.randomUUID();

  function makeStaticScenes(versionId: string) {
    const entry = StoryScene.create({
      storyVersionId: versionId,
      sceneKey: "entry",
      sequenceNumber: 0,
      sceneType: "narrative",
      narrativeText: "Once upon a time...",
      isEntryScene: true,
    });
    const ending = StoryScene.create({
      storyVersionId: versionId,
      sceneKey: "ending",
      sequenceNumber: 1,
      sceneType: "ending",
      narrativeText: "The end.",
      isTerminalScene: true,
    });
    return { entry, ending };
  }

  it("publishes a frozen version after graph validation", () => {
    const version = StoryVersion.create({
      storyDefinitionId: definitionId,
      versionNumber: 1,
      schemaVersion: 1,
      title: "v1",
      storyMode: "interactive",
    });

    const { entry, ending } = makeStaticScenes(version.id);
    const transition = StorySceneTransition.create({
      storyVersionId: version.id,
      fromSceneId: entry.id,
      toSceneId: ending.id,
      transitionType: "automatic",
    });

    version.freeze("hash-1");
    version.validatesGraph([entry, ending], [transition]);
    version.publish();
    expect(version.publicationStatus).toBe("published");
  });

  it("rejects mutation after publish", () => {
    const version = StoryVersion.create({
      storyDefinitionId: definitionId,
      versionNumber: 2,
      schemaVersion: 1,
      title: "v2",
      storyMode: "static",
    });
    const { entry, ending } = makeStaticScenes(version.id);
    version.freeze("hash-2");
    version.validatesGraph([entry, ending], []);
    version.publish();
    expect(() => version.freeze("hash-3")).toThrow(ValidationError);
    expect(() => version.publish()).toThrow(ValidationError);
  });

  it("rejects publishing without freezing", () => {
    const version = StoryVersion.create({
      storyDefinitionId: definitionId,
      versionNumber: 3,
      schemaVersion: 1,
      title: "v3",
      storyMode: "static",
    });
    expect(() => version.publish()).toThrow(ValidationError);
  });

  it("rejects graph without entry scene", () => {
    const version = StoryVersion.create({
      storyDefinitionId: definitionId,
      versionNumber: 4,
      schemaVersion: 1,
      title: "v4",
      storyMode: "static",
    });
    const scene = StoryScene.create({
      storyVersionId: version.id,
      sceneKey: "only",
      sequenceNumber: 0,
      sceneType: "narrative",
      narrativeText: "...",
    });
    expect(() => version.validatesGraph([scene], [])).toThrow(ValidationError);
  });
});
