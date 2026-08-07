import { describe, it, expect, beforeEach } from "vitest";
import {
  createQuestTemplate,
  getQuestTemplateByKey,
  listQuestTemplates,
  instantiateQuestFromTemplate,
  __setTestQuestTemplateRepo,
  __setTestQuestTemplateDb,
} from "../../src/application/quest-template.service";
import {
  __setTestQuestRepo,
  __setTestQuestDb,
} from "../../src/application/quest.service";
import type { QuestTemplateRepository } from "../../src/db/repositories/interfaces/quest-template.repository";
import type { QuestTemplateState } from "../../src/domain/world-types";
import type { Database } from "../../src/db/client";

const HOUSEHOLD = "00000000-0000-4000-8000-000000000020";
const WORLD = "00000000-0000-4000-8000-000000000030";

function makeTemplateState(): QuestTemplateState {
  return {
    id: "template-1",
    templateKey: "lost-letter-quest",
    displayName: "The Lost Letter",
    description: "Find the owner of the lost letter.",
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    objectives: [
      { index: 0, objectiveKey: "ask-shopkeeper", title: "Ask the shopkeeper" },
      { index: 1, objectiveKey: "deliver-letter", title: "Deliver the letter" },
    ],
  };
}

function createMockRepo(): QuestTemplateRepository & {
  state: QuestTemplateState;
  insertedObjectives: {
    templateId: string;
    objectiveIndex: number;
    objectiveKey: string;
    title: string;
  }[];
  setState: (s: QuestTemplateState) => void;
} {
  let state: QuestTemplateState = makeTemplateState();
  const insertedObjectives: {
    templateId: string;
    objectiveIndex: number;
    objectiveKey: string;
    title: string;
  }[] = [];
  return {
    state,
    insertedObjectives,
    setState: (s: QuestTemplateState) => {
      state = s;
    },
    async createTemplate(_tx, data) {
      return data as never;
    },
    async findTemplateById(_tx, id) {
      return state.id === id ? (state as never) : undefined;
    },
    async findTemplateByKey(_tx, templateKey) {
      return state.templateKey === templateKey ? (state as never) : undefined;
    },
    async listTemplates() {
      return [state] as never;
    },
    async insertTemplateObjective(_tx, data) {
      insertedObjectives.push({
        templateId: data.templateId,
        objectiveIndex: data.objectiveIndex,
        objectiveKey: data.objectiveKey,
        title: data.title,
      });
      return { id: `objective-${data.objectiveIndex}`, ...data } as never;
    },
    async findTemplateObjectives() {
      if (insertedObjectives.length > 0) {
        return insertedObjectives as never;
      }
      return state.objectives.map((o) => ({
        id: `objective-${o.index}`,
        templateId: state.id,
        objectiveIndex: o.index,
        objectiveKey: o.objectiveKey,
        title: o.title,
      })) as never;
    },
  };
}

function wireDb() {
  const stubDb = {
    transaction: <T>(fn: (tx: never) => Promise<T>) => fn({} as never),
  } as unknown as Database;
  __setTestQuestTemplateDb(stubDb);
  __setTestQuestDb(stubDb);
}

describe("QuestTemplateService", () => {
  beforeEach(() => {
    __setTestQuestTemplateRepo(undefined);
    __setTestQuestRepo(undefined);
    wireDb();
  });

  it("creates a template with ordered objectives", async () => {
    const repo = createMockRepo();
    __setTestQuestTemplateRepo(repo);

    const template = await createQuestTemplate({
      templateKey: "fresh-key",
      displayName: "Fresh Quest",
      description: "A fresh quest.",
      objectives: [{ objectiveKey: "o1", title: "Objective one" }],
    });

    expect(template.templateKey).toBe("fresh-key");
    expect(template.version).toBe(1);
    expect(template.objectives).toHaveLength(1);
  });

  it("rejects a duplicate template key", async () => {
    const repo = createMockRepo();
    __setTestQuestTemplateRepo(repo);

    await expect(
      createQuestTemplate({
        templateKey: "lost-letter-quest",
        displayName: "Dup",
        description: "dup",
        objectives: [{ objectiveKey: "o1", title: "x" }],
      }),
    ).rejects.toMatchObject({ code: "QUEST_TEMPLATE_KEY_EXISTS" });
  });

  it("gets a template by key", async () => {
    const repo = createMockRepo();
    __setTestQuestTemplateRepo(repo);

    const template = await getQuestTemplateByKey("lost-letter-quest");
    expect(template).not.toBeNull();
    expect(template?.templateKey).toBe("lost-letter-quest");
    expect(template?.objectives).toHaveLength(2);
  });

  it("returns null for a missing template key", async () => {
    const repo = createMockRepo();
    repo.setState(makeTemplateState());
    __setTestQuestTemplateRepo(repo);

    expect(await getQuestTemplateByKey("missing-key")).toBeNull();
  });

  it("lists templates", async () => {
    const repo = createMockRepo();
    __setTestQuestTemplateRepo(repo);

    const templates = await listQuestTemplates();
    expect(templates).toHaveLength(1);
  });

  it("instantiates a template into an inactive quest with ordered objectives", async () => {
    const templateRepo = createMockRepo();
    __setTestQuestTemplateRepo(templateRepo);

    const insertedObjectives: { index: number; title: string }[] = [];
    const questRepo = {
      findQuestById: async () => undefined as never,
      createQuest: async (
        _tx: never,
        data: { id: string; objectiveIndex?: number; title?: string },
      ) => data as never,
      insertObjective: async (
        _tx: never,
        data: {
          objectiveIndex: number;
          title: string;
        },
      ) => {
        insertedObjectives.push({
          index: data.objectiveIndex,
          title: data.title,
        });
        return data as never;
      },
      findObjectivesByQuestId: async () => insertedObjectives as never,
    } as never;
    __setTestQuestRepo(questRepo);

    const quest = await instantiateQuestFromTemplate({
      templateKey: "lost-letter-quest",
      householdId: HOUSEHOLD,
      worldId: WORLD,
      storySessionId: null,
    });

    expect(quest.status).toBe("inactive");
    expect(quest.title).toBe("The Lost Letter");
    expect(quest.summary).toBe("Find the owner of the lost letter.");
    expect(quest.objectives).toHaveLength(2);
    expect(quest.objectives[0]?.title).toBe("Ask the shopkeeper");
    expect(quest.objectives[1]?.title).toBe("Deliver the letter");
  });

  it("rejects instantiation of a missing template", async () => {
    const repo = createMockRepo();
    repo.setState({
      ...makeTemplateState(),
      templateKey: "other-key",
    });
    __setTestQuestTemplateRepo(repo);

    await expect(
      instantiateQuestFromTemplate({
        templateKey: "missing-key",
        householdId: HOUSEHOLD,
        worldId: WORLD,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
