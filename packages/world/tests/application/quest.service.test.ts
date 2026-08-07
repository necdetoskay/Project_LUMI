import { describe, it, expect, beforeEach } from "vitest";
import {
  createQuest,
  activateQuest,
  progressObjective,
  pauseQuest,
  resumeQuest,
  abandonQuest,
  getQuestById,
  getQuestsByWorldId,
  __setTestQuestRepo,
  __setTestQuestDb,
} from "../../src/application/quest.service";
import type { QuestRepository } from "../../src/db/repositories/interfaces/quest.repository";
import type { QuestState } from "../../src/domain/world-types";
import type { Database } from "../../src/db/client";

const HOUSEHOLD = "00000000-0000-4000-8000-000000000020";
const WORLD = "00000000-0000-4000-8000-000000000030";

function makeState(overrides: Partial<QuestState> = {}): QuestState {
  return {
    id: "quest-1",
    householdId: HOUSEHOLD,
    worldId: WORLD,
    storySessionId: null,
    title: "Lost Letter",
    summary: "Return the letter.",
    objectives: [
      {
        index: 0,
        title: "Find owner",
        status: "locked",
        evidenceRef: null,
        completedAt: null,
      },
      {
        index: 1,
        title: "Deliver",
        status: "locked",
        evidenceRef: null,
        completedAt: null,
      },
    ],
    status: "inactive",
    version: 1,
    evidenceRef: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as QuestState;
}

function createMockRepo(): QuestRepository & {
  state: QuestState;
  setState: (s: QuestState) => void;
} {
  let state: QuestState = makeState();
  return {
    state,
    setState: (s: QuestState) => {
      state = s;
    },
    async createQuest(_tx, data) {
      return data as never;
    },
    async findQuestById(_tx, id) {
      return state.id === id ? (state as never) : undefined;
    },
    async findQuestsByWorldId() {
      return [state] as never;
    },
    async findQuestsBySessionId() {
      return [state] as never;
    },
    async updateQuest(_tx, _id, data) {
      state = {
        ...state,
        ...data,
        objectives: state.objectives,
      } as unknown as QuestState;
      return state as never;
    },
    async insertObjective(_tx, data) {
      return data as never;
    },
    async updateObjective(_tx, _id, data) {
      return data as never;
    },
    async findObjectivesByQuestId() {
      return state.objectives.map((o) => ({
        id: `objective-${o.index}`,
        questId: state.id,
        objectiveIndex: o.index,
        title: o.title,
        status: o.status,
        evidenceRef: o.evidenceRef,
        completedAt: o.completedAt,
      })) as never;
    },
  };
}

describe("QuestService", () => {
  beforeEach(() => {
    __setTestQuestRepo(undefined);
    const stubDb = {
      transaction: <T>(fn: (tx: never) => Promise<T>) => fn({} as never),
    } as unknown as Database;
    __setTestQuestDb(stubDb);
  });

  it("creates an inactive quest with ordered objectives", async () => {
    const repo = createMockRepo();
    __setTestQuestRepo(repo);

    const quest = await createQuest({
      householdId: HOUSEHOLD,
      worldId: WORLD,
      title: "Lost Letter",
      summary: "Return the letter.",
      objectives: [{ title: "Find owner" }, { title: "Deliver" }],
    });

    expect(quest.status).toBe("inactive");
    expect(quest.version).toBe(1);
    expect(quest.objectives).toHaveLength(2);
    expect(quest.objectives[0]).toMatchObject({
      index: 0,
      title: "Find owner",
      status: "locked",
    });
  });

  it("activates an inactive quest", async () => {
    const repo = createMockRepo();
    repo.setState(makeState({ status: "inactive" }));
    __setTestQuestRepo(repo);

    const activated = await activateQuest("quest-1");
    expect(activated.status).toBe("active");
    expect(activated.version).toBe(2);
  });

  it("progresses an objective on an active quest and bumps version", async () => {
    const repo = createMockRepo();
    repo.setState(makeState({ status: "active", version: 2 }));
    __setTestQuestRepo(repo);

    const progressed = await progressObjective("quest-1", {
      objectiveIndex: 0,
      evidenceRef: "evidence://o0",
    });

    expect(progressed.objectives[0]).toMatchObject({
      status: "completed",
      evidenceRef: "evidence://o0",
    });
    expect(progressed.version).toBe(3);
  });

  it("auto-completes the quest after its final objective", async () => {
    const repo = createMockRepo();
    repo.setState(
      makeState({
        status: "active",
        version: 2,
        objectives: [
          {
            index: 0,
            title: "Find owner",
            status: "completed",
            evidenceRef: "evidence://o0",
            completedAt: new Date(),
          },
          {
            index: 1,
            title: "Deliver",
            status: "locked",
            evidenceRef: null,
            completedAt: null,
          },
        ],
      }),
    );
    __setTestQuestRepo(repo);

    const completed = await progressObjective("quest-1", {
      objectiveIndex: 1,
      evidenceRef: "evidence://o1",
    });

    expect(completed.status).toBe("completed");
  });

  it("rejects progression on an inactive quest", async () => {
    const repo = createMockRepo();
    repo.setState(makeState({ status: "inactive" }));
    __setTestQuestRepo(repo);

    await expect(
      progressObjective("quest-1", {
        objectiveIndex: 0,
        evidenceRef: "evidence://o0",
      }),
    ).rejects.toMatchObject({ code: "QUEST_INVALID_TRANSITION" });
  });

  it("pauses and resumes a quest", async () => {
    const repo = createMockRepo();
    repo.setState(makeState({ status: "active", version: 2 }));
    __setTestQuestRepo(repo);

    const paused = await pauseQuest("quest-1");
    expect(paused.status).toBe("paused");

    repo.setState(makeState({ status: "paused", version: 3 }));
    const resumed = await resumeQuest("quest-1");
    expect(resumed.status).toBe("active");
  });

  it("abandons an active quest", async () => {
    const repo = createMockRepo();
    repo.setState(makeState({ status: "active", version: 2 }));
    __setTestQuestRepo(repo);

    const abandoned = await abandonQuest("quest-1");
    expect(abandoned.status).toBe("abandoned");
  });

  it("returns null for a missing quest", async () => {
    const repo = createMockRepo();
    repo.setState(makeState({ id: "quest-1" }));
    __setTestQuestRepo(repo);

    expect(await getQuestById("quest-2")).toBeNull();
  });

  it("lists quests by world", async () => {
    const repo = createMockRepo();
    repo.setState(makeState({ status: "active" }));
    __setTestQuestRepo(repo);

    const quests = await getQuestsByWorldId(WORLD);
    expect(quests).toHaveLength(1);
  });
});
