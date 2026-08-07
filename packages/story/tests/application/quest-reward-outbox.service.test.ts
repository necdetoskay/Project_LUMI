import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  enqueueQuestRewardIntent,
  __setTestQuestRewardOutboxDb,
} from "../../src/application/quest-reward-outbox.service";

const mockRepo = {
  enqueueOutbox: vi.fn(),
};

vi.mock("../../src/db/repositories/drizzle/drizzle-story.repository", () => ({
  DrizzleStoryRepository: class {
    enqueueOutbox = mockRepo.enqueueOutbox;
  },
}));

vi.mock("../../src/application/db", () => ({
  getStoryDb: () => ({}),
}));

const HOUSEHOLD = "00000000-0000-4000-8000-000000000020";
const WORLD = "00000000-0000-4000-8000-000000000030";
const SESSION = "00000000-0000-4000-8000-000000000040";
const CHILD = "00000000-0000-4000-8000-000000000050";
const QUEST = "quest-1";

describe("enqueueQuestRewardIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.enqueueOutbox.mockResolvedValue({});
    __setTestQuestRewardOutboxDb(undefined);
  });

  it("enqueues a quest_reward_grant intent with the reward payload", async () => {
    await enqueueQuestRewardIntent({
      householdId: HOUSEHOLD,
      worldId: WORLD,
      questId: QUEST,
      storySessionId: SESSION,
      childProfileId: CHILD,
      reward: { itemDefinitionKey: "golden-compass", quantity: 1 },
      evidenceRef: "evidence://q1",
    });

    expect(mockRepo.enqueueOutbox).toHaveBeenCalledTimes(1);
    const outbox = mockRepo.enqueueOutbox.mock.calls[0]![1] as {
      intentType: string;
      idempotencyKey: string;
      payload: Record<string, unknown>;
      status: string;
    };
    expect(outbox.intentType).toBe("quest_reward_grant");
    expect(outbox.idempotencyKey).toBe(`quest-reward:${QUEST}`);
    expect(outbox.payload).toMatchObject({
      questId: QUEST,
      householdId: HOUSEHOLD,
      worldId: WORLD,
      storySessionId: SESSION,
      childProfileId: CHILD,
      reward: { itemDefinitionKey: "golden-compass", quantity: 1 },
      evidenceRef: "evidence://q1",
    });
    expect(outbox.status).toBe("pending");
  });
});
