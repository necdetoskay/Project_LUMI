import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  OutcomeManifest,
  StoryContextSnapshot,
  NarrativeEventExtractor,
  EvidenceValidator,
  WorldCommitRuleEngine,
  defaultOutcomeRules,
  type WorldChange,
} from "../../src/domain/outcome";
import { WorldCommitService } from "../../src/application/world-commit.service";

const npcA = "00000000-0000-4000-8000-000000000001";

const mockRepo = {
  findCommitByIdempotencyKey: vi.fn(),
  getWorldVersion: vi.fn(),
  recordCommit: vi.fn(),
  upsertWorldVersion: vi.fn(),
};

vi.mock("../../src/db/repositories/drizzle/drizzle-story.repository", () => ({
  DrizzleStoryRepository: class {
    findCommitByIdempotencyKey = mockRepo.findCommitByIdempotencyKey;
    getWorldVersion = mockRepo.getWorldVersion;
    recordCommit = mockRepo.recordCommit;
    upsertWorldVersion = mockRepo.upsertWorldVersion;
  },
}));

vi.mock("../../src/application/db", () => ({
  getStoryDb: () => ({
    transaction: async (fn: (tx: unknown) => Promise<void>) => fn({}),
  }),
}));

function makeManifest() {
  return OutcomeManifest.create({
    storySessionId: "00000000-0000-4000-8000-000000000010",
    householdId: "00000000-0000-4000-8000-000000000020",
    worldId: "00000000-0000-4000-8000-000000000030",
    source: "story_session",
    sourceSceneId: "scene-1",
    changes: [
      {
        key: "c1",
        outcomeType: "npc_state_update",
        entityId: npcA,
        operation: "set",
        field: "need.hunger",
        value: 80,
        evidenceRef: "scene://s1#1",
      },
    ],
  });
}

function makeSnapshot() {
  return StoryContextSnapshot.create({
    storySessionId: "00000000-0000-4000-8000-000000000010",
    householdId: "00000000-0000-4000-8000-000000000020",
    worldId: "00000000-0000-4000-8000-000000000030",
    worldStateHash: "hash-before",
    entities: [
      {
        entityId: npcA,
        entityKind: "npc",
        state: { need: { hunger: 40 } },
        stateHash: "npc-hash",
      },
    ],
  });
}

describe("WorldCommitService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.findCommitByIdempotencyKey.mockResolvedValue(undefined);
    mockRepo.getWorldVersion.mockResolvedValue(undefined);
    mockRepo.recordCommit.mockResolvedValue({ id: "commit-1" });
    mockRepo.upsertWorldVersion.mockResolvedValue({});
  });

  it("commits a manifest and bumps world version", async () => {
    const service = new WorldCommitService();
    const result = await service.commitManifest({
      manifest: makeManifest(),
      snapshot: makeSnapshot(),
      extractor: new NarrativeEventExtractor(),
      validator: new EvidenceValidator(),
      ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
    });

    expect(result.worldVersionBefore).toBe(1);
    expect(result.worldVersionAfter).toBe(2);
    expect(result.worldStateHash).toBeTruthy();
    expect(result.changes).toHaveLength(1);
    expect(mockRepo.recordCommit).toHaveBeenCalledTimes(1);
    expect(mockRepo.upsertWorldVersion).toHaveBeenCalledTimes(1);
    expect(mockRepo.upsertWorldVersion.mock.calls[0]![1].currentVersion).toBe(
      "2",
    );
  });

  it("is idempotent: a previously committed key short-circuits", async () => {
    mockRepo.findCommitByIdempotencyKey.mockResolvedValue({
      id: "existing-commit",
      worldVersionBefore: 1,
      worldVersionAfter: 2,
      worldStateHash: "existing-hash",
    });
    const service = new WorldCommitService();
    const result = await service.commitManifest({
      manifest: makeManifest(),
      snapshot: makeSnapshot(),
      extractor: new NarrativeEventExtractor(),
      validator: new EvidenceValidator(),
      ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
    });

    expect(result.commitId).toBe("existing-commit");
    expect(mockRepo.recordCommit).not.toHaveBeenCalled();
    expect(mockRepo.upsertWorldVersion).not.toHaveBeenCalled();
  });

  it("rejects a manifest whose evidence fails validation (nothing written)", async () => {
    const snapshot = makeSnapshot();
    // Snapshot without the entity → validator rejects.
    const badSnapshot = StoryContextSnapshot.create({
      storySessionId: snapshot.storySessionId,
      householdId: snapshot.householdId,
      worldId: snapshot.worldId,
      worldStateHash: "hash-before",
      entities: [],
    });
    const service = new WorldCommitService();

    await expect(
      service.commitManifest({
        manifest: makeManifest(),
        snapshot: badSnapshot,
        extractor: new NarrativeEventExtractor(),
        validator: new EvidenceValidator(),
        ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
      }),
    ).rejects.toThrow("EVIDENCE_VALIDATION_FAILED");

    expect(mockRepo.recordCommit).not.toHaveBeenCalled();
    expect(mockRepo.upsertWorldVersion).not.toHaveBeenCalled();
  });

  it("increments from an existing world version", async () => {
    mockRepo.getWorldVersion.mockResolvedValue({
      currentVersion: "7",
      worldStateHash: "h7",
    });
    const service = new WorldCommitService();
    const result = await service.commitManifest({
      manifest: makeManifest(),
      snapshot: makeSnapshot(),
      extractor: new NarrativeEventExtractor(),
      validator: new EvidenceValidator(),
      ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
    });

    expect(result.worldVersionBefore).toBe(7);
    expect(result.worldVersionAfter).toBe(8);
  });

  it("produces a deterministic world state hash for equal commits", async () => {
    const service = new WorldCommitService();
    const input = {
      manifest: makeManifest(),
      snapshot: makeSnapshot(),
      extractor: new NarrativeEventExtractor(),
      validator: new EvidenceValidator(),
      ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
    };
    const r1 = await service.commitManifest(input);
    mockRepo.recordCommit.mockClear();
    const r2 = await service.commitManifest(input);
    expect(r1.worldStateHash).toBe(r2.worldStateHash);
    expect(r1.changes.map((c: WorldChange) => c.changeKey)).toEqual(
      r2.changes.map((c: WorldChange) => c.changeKey),
    );
  });
});
