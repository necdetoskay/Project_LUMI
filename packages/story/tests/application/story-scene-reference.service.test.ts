import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionByIdMock, getStoryVersionGraphMock } = vi.hoisted(() => ({
  getSessionByIdMock: vi.fn(),
  getStoryVersionGraphMock: vi.fn(),
}));

vi.mock("../../src/application/story-session.service", () => ({
  getSessionById: getSessionByIdMock,
}));

vi.mock("../../src/application/story-definition.service", () => ({
  getStoryVersionGraph: getStoryVersionGraphMock,
}));

import {
  resolveCanonicalStorySceneReferences,
  resolveCanonicalStorySceneReferencesForSession,
} from "../../src/application/story-scene-reference.service";

const SESSION_ID = "00000000-0000-4000-8000-000000000010";
const OTHER_SESSION_ID = "00000000-0000-4000-8000-000000000011";
const DEFINITION_ID = "00000000-0000-4000-8000-000000000020";
const VERSION_ID = "00000000-0000-4000-8000-000000000030";
const AUTHORED_SCENE_ID = "00000000-0000-4000-8000-000000000101";
const GENERATED_SCENE_ID = "00000000-0000-4000-8000-000000000102";
const FOREIGN_GENERATED_SCENE_ID = "00000000-0000-4000-8000-000000000103";

const scenes = [
  {
    id: AUTHORED_SCENE_ID,
    sceneKey: "arrival",
    metadata: {},
  },
  {
    id: GENERATED_SCENE_ID,
    sceneKey: `generated:${SESSION_ID}:hash-a`,
    metadata: {
      generated: true,
      generatedForSessionId: SESSION_ID,
      sourceGeneratedSceneId: "provider-scene-17",
    },
  },
  {
    id: FOREIGN_GENERATED_SCENE_ID,
    sceneKey: `generated:${OTHER_SESSION_ID}:hash-b`,
    metadata: {
      generated: true,
      generatedForSessionId: OTHER_SESSION_ID,
      sourceGeneratedSceneId: "provider-scene-foreign",
    },
  },
];

describe("canonical story scene reference resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionByIdMock.mockResolvedValue({
      id: SESSION_ID,
      storyDefinitionId: DEFINITION_ID,
      storyVersionId: VERSION_ID,
    });
    getStoryVersionGraphMock.mockResolvedValue({
      definition: { id: DEFINITION_ID },
      version: {
        id: VERSION_ID,
        storyDefinitionId: DEFINITION_ID,
      },
      scenes,
      transitions: [],
    });
  });

  it("resolves canonical ids, authored scene keys, and generated provider refs to persisted scene ids", () => {
    const resolved = resolveCanonicalStorySceneReferences({
      sessionId: SESSION_ID,
      scenes,
      sourceRefs: [AUTHORED_SCENE_ID, "arrival", "provider-scene-17"],
    });

    expect(Object.fromEntries(resolved)).toEqual({
      [AUTHORED_SCENE_ID]: AUTHORED_SCENE_ID,
      arrival: AUTHORED_SCENE_ID,
      "provider-scene-17": GENERATED_SCENE_ID,
    });
  });

  it("fails closed for a generated scene owned by another session", () => {
    expect(() =>
      resolveCanonicalStorySceneReferences({
        sessionId: SESSION_ID,
        scenes,
        sourceRefs: ["provider-scene-foreign"],
      }),
    ).toThrowError(
      expect.objectContaining({ code: "STORY_SCENE_REFERENCE_NOT_FOUND" }),
    );
  });

  it("fails closed when one source ref could identify multiple persisted scenes", () => {
    expect(() =>
      resolveCanonicalStorySceneReferences({
        sessionId: SESSION_ID,
        scenes: [
          ...scenes,
          {
            id: "00000000-0000-4000-8000-000000000104",
            sceneKey: "provider-scene-17",
            metadata: {},
          },
        ],
        sourceRefs: ["provider-scene-17"],
      }),
    ).toThrowError(
      expect.objectContaining({ code: "STORY_SCENE_REFERENCE_AMBIGUOUS" }),
    );
  });

  it("loads only the session story version before resolving references", async () => {
    const resolved = await resolveCanonicalStorySceneReferencesForSession({
      sessionId: SESSION_ID,
      sourceRefs: ["arrival", "provider-scene-17"],
    });

    expect(getSessionByIdMock).toHaveBeenCalledWith(SESSION_ID);
    expect(getStoryVersionGraphMock).toHaveBeenCalledWith(VERSION_ID);
    expect(Object.fromEntries(resolved)).toEqual({
      arrival: AUTHORED_SCENE_ID,
      "provider-scene-17": GENERATED_SCENE_ID,
    });
  });

  it("rejects a story-version graph from another story definition", async () => {
    getStoryVersionGraphMock.mockResolvedValue({
      definition: null,
      version: {
        id: VERSION_ID,
        storyDefinitionId: "00000000-0000-4000-8000-000000000099",
      },
      scenes,
      transitions: [],
    });

    await expect(
      resolveCanonicalStorySceneReferencesForSession({
        sessionId: SESSION_ID,
        sourceRefs: ["arrival"],
      }),
    ).rejects.toMatchObject({ code: "STORY_SCENE_SCOPE_MISMATCH" });
  });
});
