import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  OutcomeManifest,
  StoryContextSnapshot,
  NarrativeEventExtractor,
  EvidenceValidator,
  WorldCommitRuleEngine,
  defaultOutcomeRules,
} from "../../src/domain/outcome";
import { advanceSession } from "../../src/application/story-session.service";

const npcA = "00000000-0000-4000-8000-000000000001";
const SESSION_ID = "00000000-0000-4000-8000-000000000010";
const HOUSEHOLD_ID = "00000000-0000-4000-8000-000000000020";
const WORLD_ID = "00000000-0000-4000-8000-000000000030";
const STORY_VERSION_ID = "00000000-0000-4000-8000-000000000040";
const NEXT_SCENE_ID = "00000000-0000-4000-8000-000000000050";

const mockRepo = {
  findSessionById: vi.fn(),
  findIdempotencyRecord: vi.fn(),
  findSceneById: vi.fn(),
  updateSession: vi.fn(),
  findSceneVisitsBySession: vi.fn(),
  findLatestCheckpoint: vi.fn(),
  createSceneVisit: vi.fn(),
  createCheckpoint: vi.fn(),
  recordEvent: vi.fn(),
  recordIdempotency: vi.fn(),
  findCommitByIdempotencyKey: vi.fn(),
  getWorldVersion: vi.fn(),
  recordCommit: vi.fn(),
  enqueueOutbox: vi.fn(),
  upsertWorldVersion: vi.fn(),
  findSessionCharacters: vi.fn(),
  findSessionByChildProfile: vi.fn(),
  findScenesByVersion: vi.fn(),
};

vi.mock("../../src/db/repositories/drizzle/drizzle-story.repository", () => ({
  DrizzleStoryRepository: class {
    findSessionById = mockRepo.findSessionById;
    findIdempotencyRecord = mockRepo.findIdempotencyRecord;
    findSceneById = mockRepo.findSceneById;
    updateSession = mockRepo.updateSession;
    findSceneVisitsBySession = mockRepo.findSceneVisitsBySession;
    findLatestCheckpoint = mockRepo.findLatestCheckpoint;
    createSceneVisit = mockRepo.createSceneVisit;
    createCheckpoint = mockRepo.createCheckpoint;
    recordEvent = mockRepo.recordEvent;
    recordIdempotency = mockRepo.recordIdempotency;
    findCommitByIdempotencyKey = mockRepo.findCommitByIdempotencyKey;
    getWorldVersion = mockRepo.getWorldVersion;
    recordCommit = mockRepo.recordCommit;
    enqueueOutbox = mockRepo.enqueueOutbox;
    upsertWorldVersion = mockRepo.upsertWorldVersion;
    findSessionCharacters = mockRepo.findSessionCharacters;
    findScenesByVersion = mockRepo.findScenesByVersion;
  },
}));

vi.mock("../../src/application/db", () => ({
  getStoryDb: () => ({
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  }),
}));

const sessionRecord = {
  id: SESSION_ID,
  householdId: HOUSEHOLD_ID,
  childProfileId: "00000000-0000-4000-8000-000000000011",
  worldId: WORLD_ID,
  storyDefinitionId: "00000000-0000-4000-8000-000000000012",
  storyVersionId: STORY_VERSION_ID,
  currentSceneId: "00000000-0000-4000-8000-000000000051",
  sessionStatus: "active",
  playbackMode: "reading",
  startedAt: new Date(),
  lastInteractedAt: new Date(),
  pausedAt: null,
  completedAt: null,
  abandonmentReason: null,
  contextSnapshot: {},
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sceneRecord = {
  id: NEXT_SCENE_ID,
  storyVersionId: STORY_VERSION_ID,
  sceneKey: "scene-2",
  sequenceNumber: 2,
  sceneType: "narrative",
  title: "Scene 2",
  narrativeText: "text",
  isEntryScene: false,
  isTerminalScene: false,
  metadata: {},
  createdAt: new Date(),
};

function makeOutcome() {
  const manifest = OutcomeManifest.create({
    storySessionId: SESSION_ID,
    householdId: HOUSEHOLD_ID,
    worldId: WORLD_ID,
    source: "story_session",
    sourceSceneId: "00000000-0000-4000-8000-000000000051",
    changes: [
      {
        key: "e2e-c1",
        outcomeType: "npc_state_update",
        entityId: npcA,
        operation: "set",
        field: "need.hunger",
        value: 70,
        evidenceRef: "scene://s1#e2e",
      },
    ],
  });
  const snapshot = StoryContextSnapshot.create({
    storySessionId: SESSION_ID,
    householdId: HOUSEHOLD_ID,
    worldId: WORLD_ID,
    worldStateHash: "e2e-before",
    entities: [
      {
        entityId: npcA,
        entityKind: "npc",
        state: { need: { hunger: 40 } },
        stateHash: "e2e-npc-hash",
      },
    ],
  });
  return {
    manifest,
    snapshot,
    extractor: new NarrativeEventExtractor(),
    validator: new EvidenceValidator(),
    ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
  };
}

describe("advanceSession + outcome commit (S22-T06 E2E)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.findSessionById.mockResolvedValue(sessionRecord);
    mockRepo.findIdempotencyRecord.mockResolvedValue(undefined);
    mockRepo.findSceneById.mockResolvedValue(sceneRecord);
    mockRepo.updateSession.mockResolvedValue({ ...sessionRecord, version: 2 });
    mockRepo.findSceneVisitsBySession.mockResolvedValue([]);
    mockRepo.findLatestCheckpoint.mockResolvedValue(undefined);
    mockRepo.findCommitByIdempotencyKey.mockResolvedValue(undefined);
    mockRepo.getWorldVersion.mockResolvedValue(undefined);
    mockRepo.recordCommit.mockResolvedValue({ id: "commit-1" });
    mockRepo.findSessionCharacters.mockResolvedValue([]);
  });

  it("commits the world outcome in the same transaction as the advance", async () => {
    const outcome = makeOutcome();
    await advanceSession({
      sessionId: SESSION_ID,
      expectedVersion: 1,
      nextSceneId: NEXT_SCENE_ID,
      outcome,
    });

    // Session advance writes happened.
    expect(mockRepo.updateSession).toHaveBeenCalledTimes(1);
    expect(mockRepo.createSceneVisit).toHaveBeenCalledTimes(1);
    // World commit happened within the same tx.
    expect(mockRepo.recordCommit).toHaveBeenCalledTimes(1);
    expect(mockRepo.upsertWorldVersion).toHaveBeenCalledTimes(1);
    // Event sourcing for both advance + commit.
    const eventTypes = mockRepo.recordEvent.mock.calls.map(
      (call) => call[1].eventType as string,
    );
    expect(eventTypes).toContain("STORY_SCENE_ENTERED");
    expect(eventTypes).toContain("STORY_WORLD_COMMIT_APPLIED");
  });

  it("commits with an incremented world version", async () => {
    mockRepo.getWorldVersion.mockResolvedValue({
      currentVersion: "3",
      worldStateHash: "h3",
    });
    const outcome = makeOutcome();
    await advanceSession({
      sessionId: SESSION_ID,
      expectedVersion: 1,
      nextSceneId: NEXT_SCENE_ID,
      outcome,
    });

    const commit = mockRepo.recordCommit.mock.calls[0]![1];
    expect(commit.worldVersionBefore).toBe(3);
    expect(commit.worldVersionAfter).toBe(4);
    expect(mockRepo.upsertWorldVersion.mock.calls[0]![1].currentVersion).toBe(
      "4",
    );
  });

  it("advances without committing when no outcome is provided", async () => {
    await advanceSession({
      sessionId: SESSION_ID,
      expectedVersion: 1,
      nextSceneId: NEXT_SCENE_ID,
    });

    expect(mockRepo.recordCommit).not.toHaveBeenCalled();
    expect(mockRepo.upsertWorldVersion).not.toHaveBeenCalled();
    expect(mockRepo.updateSession).toHaveBeenCalledTimes(1);
  });

  it("selects a scene matching a pending hook's scene type during advance", async () => {
    const choiceSceneId = "00000000-0000-4000-8000-000000000060";
    const scenes = [
      { id: NEXT_SCENE_ID, sceneType: "narrative", sequenceNumber: 1 },
      { id: choiceSceneId, sceneType: "choice", sequenceNumber: 2 },
    ];
    mockRepo.findScenesByVersion.mockResolvedValue(scenes);
    mockRepo.findSceneVisitsBySession.mockResolvedValue([]);

    await advanceSession({
      sessionId: SESSION_ID,
      expectedVersion: 1,
      nextSceneId: NEXT_SCENE_ID,
      pendingHook: { sceneType: "choice" },
    });

    expect(mockRepo.findScenesByVersion).toHaveBeenCalledTimes(1);
    expect(mockRepo.updateSession).toHaveBeenCalledWith(
      expect.anything(),
      SESSION_ID,
      expect.objectContaining({ currentSceneId: choiceSceneId }),
      expect.anything(),
    );
    const createdVisit = mockRepo.createSceneVisit.mock.calls[0]![1];
    expect(createdVisit.sceneId).toBe(choiceSceneId);
  });

  it("keeps the requested scene when pending hook type has no unvisited match", async () => {
    const scenes = [{ id: NEXT_SCENE_ID, sceneType: "narrative", sequenceNumber: 1 }];
    mockRepo.findScenesByVersion.mockResolvedValue(scenes);
    mockRepo.findSceneVisitsBySession.mockResolvedValue([]);

    await advanceSession({
      sessionId: SESSION_ID,
      expectedVersion: 1,
      nextSceneId: NEXT_SCENE_ID,
      pendingHook: { sceneType: "ending" },
    });

    expect(mockRepo.createSceneVisit.mock.calls[0]![1].sceneId).toBe(
      NEXT_SCENE_ID,
    );
  });
});
