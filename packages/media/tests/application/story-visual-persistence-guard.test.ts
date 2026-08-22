import { describe, expect, it } from "vitest";

import { DrizzleStoryVisualWorkspaceRepository } from "../../src/db/repositories/drizzle/drizzle-story-visual-workspace.repository";
import type { QueryExecutor } from "../../src/db/client";
import type { StoryVisualManifest } from "../../src/domain/story-visual-manifest";
import { SCOPE } from "../fixtures/media.fixtures";

function manifestWithSceneId(sceneId: string): StoryVisualManifest {
  return {
    schemaVersion: 1,
    storyId: "10000000-0000-4000-8000-000000000010",
    source: "story-generation",
    entities: [],
    sceneBindings: [],
    storyIllustrations: [
      {
        id: "illustration-1",
        sceneId,
        importance: "critical",
        compositionBrief: "Mira enters the library",
      },
    ],
  };
}

describe("story visual manifest persistence guard", () => {
  it("rejects a source scene slug before touching the database", async () => {
    const db = {
      insert: () => {
        throw new Error("DATABASE_SHOULD_NOT_BE_TOUCHED");
      },
    } as unknown as QueryExecutor;
    const repository = new DrizzleStoryVisualWorkspaceRepository(db);

    await expect(
      repository.createManifest({
        id: "10000000-0000-4000-8000-000000000011",
        scope: SCOPE,
        manifestFingerprint: "a".repeat(64),
        manifest: manifestWithSceneId("provider-scene-17"),
      }),
    ).rejects.toThrow("STORY_VISUAL_CANONICAL_SCENE_ID_REQUIRED");
  });
});
