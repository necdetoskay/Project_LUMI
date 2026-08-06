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
  findCommitByManifest: vi.fn(),
  getWorldVersion: vi.fn(),
  recordCommit: vi.fn(),
  recordEvent: vi.fn(),
  enqueueOutbox: vi.fn(),
  upsertWorldVersion: vi.fn(),
};

vi.mock("../../src/db/repositories/drizzle/drizzle-story.repository", () => ({
  DrizzleStoryRepository: class {
    findCommitByIdempotencyKey = mockRepo.findCommitByIdempotencyKey;
    findCommitByManifest = mockRepo.findCommitByManifest;
    getWorldVersion = mockRepo.getWorldVersion;
    recordCommit = mockRepo.recordCommit;
    recordEvent = mockRepo.recordEvent;
    enqueueOutbox = mockRepo.enqueueOutbox;
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
    mockRepo.findCommitByManifest.mockResolvedValue(undefined);
    mockRepo.getWorldVersion.mockResolvedValue(undefined);
    mockRepo.recordCommit.mockResolvedValue({ id: "commit-1" });
    mockRepo.recordEvent.mockResolvedValue({});
    mockRepo.enqueueOutbox.mockResolvedValue({});
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

  it("records event-sourced commit events in the same transaction", async () => {
    const service = new WorldCommitService();
    const result = await service.commitManifest({
      manifest: makeManifest(),
      snapshot: makeSnapshot(),
      extractor: new NarrativeEventExtractor(),
      validator: new EvidenceValidator(),
      ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
    });

    expect(mockRepo.recordEvent).toHaveBeenCalledTimes(1);
    const event = mockRepo.recordEvent.mock.calls[0]![1];
    expect(event.eventType).toBe("STORY_WORLD_COMMIT_APPLIED");
    expect(event.payload.commitId).toBe(result.commitId);
    expect(event.aggregateVersion).toBe(result.worldVersionAfter);
  });

  it("enqueues indirect-effect outbox intents atomically with the commit", async () => {
    const service = new WorldCommitService();
    const result = await service.commitManifest({
      manifest: makeManifest(),
      snapshot: makeSnapshot(),
      extractor: new NarrativeEventExtractor(),
      validator: new EvidenceValidator(),
      ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
    });

    // makeManifest uses npc_state_update → default rule emits one rumor intent.
    expect(mockRepo.enqueueOutbox).toHaveBeenCalledTimes(1);
    const outbox = mockRepo.enqueueOutbox.mock.calls[0]![1];
    expect(outbox.commitId).toBe(result.commitId);
    expect(outbox.intentType).toBe("npc_rumor_spread");
    expect(outbox.idempotencyKey).toBe("story-indirect:c1:rumor");
    expect(outbox.status).toBe("pending");
  });

  it("compensates a committed manifest with inverse changes + version bump", async () => {
    mockRepo.findCommitByManifest.mockResolvedValue({
      id: "orig-commit",
      manifestId: "00000000-0000-4000-8000-000000000040",
      storySessionId: "00000000-0000-4000-8000-000000000010",
      householdId: "00000000-0000-4000-8000-000000000020",
      worldId: "00000000-0000-4000-8000-000000000030",
      worldVersionBefore: 1,
      worldVersionAfter: 2,
      worldStateHash: "hash-2",
      changes: [
        {
          changeKey: "c1",
          entityId: npcA,
          kind: "set",
          field: "need.hunger",
          value: 80,
          priority: 1,
          ruleId: "default-npc-state",
          sequence: 0,
          evidenceRef: "r1",
          status: "committed",
        },
      ],
      idempotencyKey: "story-commit:00000000-0000-4000-8000-000000000040",
      status: "committed",
      createdAt: new Date(),
    });
    mockRepo.getWorldVersion.mockResolvedValue({
      currentVersion: "2",
      worldStateHash: "hash-2",
    });

    const service = new WorldCommitService();
    const manifest = makeManifest();
    const result = await service.compensateCommit({
      manifest,
      reason: "test forward-fix",
      actorHouseholdId: "00000000-0000-4000-8000-000000000020",
    });

    expect(result.compensated).toBe(true);
    expect(result.worldVersionBefore).toBe(2);
    expect(result.worldVersionAfter).toBe(3);
    expect(result.changes[0]!.changeKey).toBe("c1:comp");
    expect(mockRepo.recordCommit).toHaveBeenCalledTimes(1);
    const compRecord = mockRepo.recordCommit.mock.calls[0]![1];
    expect(compRecord.status).toBe("compensated");
    expect(mockRepo.recordEvent).toHaveBeenCalledTimes(1);
    expect(mockRepo.recordEvent.mock.calls[0]![1].eventType).toBe(
      "STORY_WORLD_COMMIT_COMPENSATED",
    );
  });

  it("throws when compensating a manifest with no committed record", async () => {
    mockRepo.findCommitByManifest.mockResolvedValue(undefined);
    const service = new WorldCommitService();
    await expect(
      service.compensateCommit({ manifest: makeManifest(), reason: "test" }),
    ).rejects.toThrow("NO_COMMIT_TO_COMPENSATE");
    expect(mockRepo.recordCommit).not.toHaveBeenCalled();
  });
});
