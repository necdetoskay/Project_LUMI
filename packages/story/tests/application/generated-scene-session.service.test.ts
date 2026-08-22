import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRepo, advanceSession } = vi.hoisted(() => ({
  mockRepo: {
    findSessionById: vi.fn(),
    findScenesByVersion: vi.fn(),
    createScene: vi.fn(),
  },
  advanceSession: vi.fn(),
}));

vi.mock("../../src/db/repositories/drizzle/drizzle-story.repository", () => ({
  DrizzleStoryRepository: class {
    findSessionById = mockRepo.findSessionById;
    findScenesByVersion = mockRepo.findScenesByVersion;
    createScene = mockRepo.createScene;
  },
}));

vi.mock("../../src/application/db", () => ({
  getStoryDb: () => ({
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  }),
}));

vi.mock("../../src/application/hash", () => ({
  hashObject: async () => "a".repeat(64),
}));

vi.mock("../../src/application/story-session.service", () => ({
  advanceSession,
  getSessionPlaybackState: vi.fn(async () => ({
    session: { ...session, version: 5, currentSceneId: "persisted-scene" },
    currentScene: { narrativeText: generatedScene.narrative },
    visits: [],
  })),
}));

import { persistGeneratedSceneAndAdvance } from "../../src/application/generated-scene-session.service";

const SESSION_ID = "00000000-0000-4000-8000-000000000010";
const VERSION_ID = "00000000-0000-4000-8000-000000000020";

const session = {
  id: SESSION_ID,
  storyVersionId: VERSION_ID,
  version: 4,
};

const generatedScene = {
  sceneId: "provider-scene-17",
  setting: "Gunes Vadisi eski kutuphanesi",
  characters: ["Arin", "Mira"],
  narrative: "Mira, Arin'e eski kopru hakkindaki soylentiyi anlatti.",
  moment: "Arin soylentinin kaynagini merak etti.",
  nextPrompt: "Bunu ilk kim gordu?",
};

describe("persistGeneratedSceneAndAdvance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.findSessionById.mockResolvedValue(session);
    mockRepo.findScenesByVersion.mockResolvedValue([
      { id: "old-1", sceneKey: "entry", sequenceNumber: 0 },
      { id: "old-2", sceneKey: "middle", sequenceNumber: 3 },
    ]);
    mockRepo.createScene.mockImplementation(async (_tx, input) => input);
    advanceSession.mockResolvedValue({
      session: { ...session, version: 5, currentSceneId: "persisted-scene" },
      currentScene: { narrativeText: generatedScene.narrative },
      visits: [],
    });
  });

  it("materializes generated prose as a normal scene then advances through the canonical session path", async () => {
    const result = await persistGeneratedSceneAndAdvance({
      sessionId: SESSION_ID,
      expectedVersion: 4,
      scene: generatedScene,
      modelId: "test-model",
      sourceHookId: "hook-rumor-1",
    });

    expect(mockRepo.createScene).toHaveBeenCalledTimes(1);
    const persisted = mockRepo.createScene.mock.calls[0]![1];
    expect(persisted.id).toBe(result.generatedSceneId);
    expect(persisted.id).not.toBe(generatedScene.sceneId);
    expect(persisted.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(persisted.storyVersionId).toBe(VERSION_ID);
    expect(persisted.sequenceNumber).toBe(4);
    expect(persisted.sceneType).toBe("narrative");
    expect(persisted.narrativeText).toBe(generatedScene.narrative);
    expect(persisted.metadata).toMatchObject({
      generated: true,
      generatedForSessionId: SESSION_ID,
      sourceGeneratedSceneId: "provider-scene-17",
      sourceHookId: "hook-rumor-1",
      modelId: "test-model",
      characters: ["Arin", "Mira"],
    });

    expect(advanceSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: SESSION_ID,
        expectedVersion: 4,
        nextSceneId: result.generatedSceneId,
      }),
    );
    expect(result.reusedPersistedScene).toBe(false);
  });

  it("reuses a previously materialized generated scene on retry", async () => {
    const generatedSceneKey = `generated:${SESSION_ID}:${"a".repeat(64)}`;
    mockRepo.findScenesByVersion.mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000099",
        sceneKey: generatedSceneKey,
        sequenceNumber: 7,
      },
    ]);

    const result = await persistGeneratedSceneAndAdvance({
      sessionId: SESSION_ID,
      expectedVersion: 4,
      scene: generatedScene,
    });

    expect(mockRepo.createScene).not.toHaveBeenCalled();
    expect(result.reusedPersistedScene).toBe(true);
    expect(result.generatedSceneId).toBe(
      "00000000-0000-4000-8000-000000000099",
    );
  });

  it("does not persist generated prose when the session version is stale", async () => {
    await expect(
      persistGeneratedSceneAndAdvance({
        sessionId: SESSION_ID,
        expectedVersion: 3,
        scene: generatedScene,
      }),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });

    // S37 replay safety performs a read-only scene lookup before rejecting a
    // stale non-replay request. No canonical mutation may occur.
    expect(mockRepo.findScenesByVersion).toHaveBeenCalledTimes(1);
    expect(mockRepo.createScene).not.toHaveBeenCalled();
    expect(advanceSession).not.toHaveBeenCalled();
  });
});
