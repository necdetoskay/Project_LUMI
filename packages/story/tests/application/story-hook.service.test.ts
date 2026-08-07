import { describe, expect, it, vi, beforeEach } from "vitest";
import { StoryHookService } from "../../src/application/story-hook.service";
import type { CreateStoryHookInput } from "../../src/application/story-hook.service";

const mockRepo = {
  findHookByOpportunityId: vi.fn(),
  createHook: vi.fn(),
  recordEvent: vi.fn(),
  enqueueOutbox: vi.fn(),
};

vi.mock("../../src/db/repositories/drizzle/drizzle-story.repository", () => ({
  DrizzleStoryRepository: class {
    findHookByOpportunityId = mockRepo.findHookByOpportunityId;
    createHook = mockRepo.createHook;
    recordEvent = mockRepo.recordEvent;
    enqueueOutbox = mockRepo.enqueueOutbox;
  },
}));

vi.mock("../../src/application/db", () => ({
  getStoryDb: () => ({
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  }),
}));

const HOUSEHOLD = "00000000-0000-4000-8000-000000000020";
const CHILD = "00000000-0000-4000-8000-000000000021";
const SESSION = "00000000-0000-4000-8000-000000000022";
const WORLD = "00000000-0000-4000-8000-000000000023";
const OPPORTUNITY = "00000000-0000-4000-8000-000000000024";
const NPC_SOURCE = "00000000-0000-4000-8000-000000000025";
const NPC_TARGET = "00000000-0000-4000-8000-000000000026";

function makeExistingHook() {
  return {
    id: "00000000-0000-4000-8000-000000000027",
    householdId: HOUSEHOLD,
    childProfileId: CHILD,
    storySessionId: SESSION,
    worldId: WORLD,
    opportunityId: OPPORTUNITY,
    hookType: "rumor",
    sceneType: "narrative",
    sourceNpcId: NPC_SOURCE,
    targetNpcId: NPC_TARGET,
    payload: { claim: "moon is made of cheese" },
    constraints: {},
    status: "pending",
    version: 1,
    createdAt: new Date(),
    consumedAt: null,
  };
}

function makeInput(overrides: Partial<CreateStoryHookInput> = {}): CreateStoryHookInput {
  return {
    householdId: HOUSEHOLD,
    childProfileId: CHILD,
    storySessionId: SESSION,
    worldId: WORLD,
    opportunityId: OPPORTUNITY,
    opportunityStatus: "accepted",
    opportunityHouseholdId: HOUSEHOLD,
    sourceNpcId: NPC_SOURCE,
    targetNpcId: NPC_TARGET,
    hookType: "rumor",
    sceneType: "narrative",
    payload: { claim: "moon is made of cheese" },
    constraints: {},
    ...overrides,
  };
}

describe("StoryHookService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.findHookByOpportunityId.mockResolvedValue(undefined);
    mockRepo.createHook.mockResolvedValue(makeExistingHook());
    mockRepo.recordEvent.mockResolvedValue({});
    mockRepo.enqueueOutbox.mockResolvedValue({});
  });

  it("rejects an opportunity that was not accepted", async () => {
    const service = new StoryHookService();
    await expect(
      service.createHook(makeInput({ opportunityStatus: "deferred" })),
    ).rejects.toMatchObject({ code: "HOOK_OPPORTUNITY_NOT_ACCEPTED" });
    expect(mockRepo.findHookByOpportunityId).not.toHaveBeenCalled();
    expect(mockRepo.createHook).not.toHaveBeenCalled();
  });

  it("rejects a cross-household opportunity", async () => {
    const service = new StoryHookService();
    await expect(
      service.createHook(
        makeInput({ opportunityHouseholdId: "00000000-0000-4000-8000-000000000099" }),
      ),
    ).rejects.toMatchObject({ code: "HOOK_HOUSEMISMATCH" });
    expect(mockRepo.findHookByOpportunityId).not.toHaveBeenCalled();
    expect(mockRepo.createHook).not.toHaveBeenCalled();
  });

  it("creates a hook and emits STORY_HOOK_CREATED on first acceptance", async () => {
    const service = new StoryHookService();
    const result = await service.createHook(makeInput());

    expect(result.created).toBe(true);
    expect(result.hook.hookType).toBe("rumor");
    expect(result.hook.opportunityId).toBe(OPPORTUNITY);
    expect(result.hook.status).toBe("pending");
    expect(mockRepo.createHook).toHaveBeenCalledTimes(1);
    expect(mockRepo.recordEvent).toHaveBeenCalledTimes(1);
    const event = mockRepo.recordEvent.mock.calls[0]![1];
    expect(event.eventType).toBe("STORY_HOOK_CREATED");
  });

  it("enqueues a story_hook_delivery outbox intent on creation", async () => {
    const service = new StoryHookService();
    const result = await service.createHook(makeInput());

    expect(result.created).toBe(true);
    expect(mockRepo.enqueueOutbox).toHaveBeenCalledTimes(1);
    const outbox = mockRepo.enqueueOutbox.mock.calls[0]![1];
    expect(outbox.intentType).toBe("story_hook_delivery");
    expect(outbox.idempotencyKey).toBe(`story-hook:${OPPORTUNITY}`);
    expect(outbox.payload).toMatchObject({
      hookId: result.hook.id,
      opportunityId: OPPORTUNITY,
      hookType: "rumor",
    });
    expect(outbox.status).toBe("pending");
  });

  it("is idempotent: re-accepting the same opportunity is a no-op", async () => {
    const existing = makeExistingHook();
    mockRepo.findHookByOpportunityId.mockResolvedValue(existing);

    const service = new StoryHookService();
    const first = await service.createHook(makeInput());
    const second = await service.createHook(makeInput());

    expect(first.created).toBe(false);
    expect(second.created).toBe(false);
    expect(first.hook.opportunityId).toBe(OPPORTUNITY);
    // The same opportunity produces exactly one persisted hook.
    expect(mockRepo.createHook).not.toHaveBeenCalled();
    // Re-acceptance does not emit another event or enqueue another delivery.
    expect(mockRepo.recordEvent).not.toHaveBeenCalled();
    expect(mockRepo.enqueueOutbox).not.toHaveBeenCalled();
    expect(mockRepo.findHookByOpportunityId).toHaveBeenCalledTimes(2);
  });

  it("returns the existing hook unchanged on idempotent re-acceptance", async () => {
    const existing = makeExistingHook();
    mockRepo.findHookByOpportunityId.mockResolvedValue(existing);

    const service = new StoryHookService();
    const result = await service.createHook(makeInput());

    expect(result.hook.opportunityId).toBe(OPPORTUNITY);
    expect(result.hook.status).toBe("pending");
    expect(result.hook.version).toBe(1);
  });
});