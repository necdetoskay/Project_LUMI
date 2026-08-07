import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  instantiateQuestFromSeed,
  assertAutomationInput,
  __setTestQuestSeedAutomationDb,
  __setTestQuestSeedAutomationRepo,
} from "../../src/application/quest-seed-automation.service";
import {
  __setTestQuestTemplateDb,
  __setTestQuestTemplateRepo,
} from "../../src/application/quest-template.service";
import {
  __setTestQuestDb,
  __setTestQuestRepo,
} from "../../src/application/quest.service";
import type { QuestRepository } from "../../src/db/repositories/interfaces/quest.repository";
import type { QuestTemplateRepository } from "../../src/db/repositories/interfaces/quest-template.repository";
import type { Database } from "../../src/db/client";

const HOUSEHOLD = "00000000-0000-4000-8000-000000000020";
const WORLD = "00000000-0000-4000-8000-000000000030";
const SESSION = "00000000-0000-4000-8000-000000000040";
const HOOK = "hook-1";

function stubDb() {
  return {
    transaction: <T>(fn: (tx: never) => Promise<T>) => fn({} as never),
  } as unknown as Database;
}

describe("QuestSeedAutomationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setTestQuestSeedAutomationDb(undefined);
    __setTestQuestSeedAutomationRepo(undefined);
    __setTestQuestTemplateDb(undefined);
    __setTestQuestTemplateRepo(undefined);
    __setTestQuestDb(undefined);
    __setTestQuestRepo(undefined);

    const db = stubDb();
    __setTestQuestSeedAutomationDb(db);
    __setTestQuestTemplateDb(db);
    __setTestQuestDb(db);
  });

  it("instantiates and activates a quest from a seeded template", async () => {
    // Seed a template.
    const templateRepo = {
      createTemplate: async (_tx: never, data: never) => data,
      findTemplateById: async () => undefined,
      findTemplateByKey: async (_tx: never, key: string) =>
        key === "lost-letter-quest"
          ? {
              id: "template-1",
              templateKey: "lost-letter-quest",
              displayName: "The Lost Letter",
              description: "Find the owner of the lost letter.",
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          : undefined,
      listTemplates: async () => [],
      insertTemplateObjective: async (_tx: never, data: never) => data,
      findTemplateObjectives: async (_tx: never, id: string) =>
        id === "template-1"
          ? [
              {
                id: "o1",
                templateId: "template-1",
                objectiveIndex: 0,
                objectiveKey: "ask-shopkeeper",
                title: "Ask the shopkeeper",
              },
              {
                id: "o2",
                templateId: "template-1",
                objectiveIndex: 1,
                objectiveKey: "deliver-letter",
                title: "Deliver the letter",
              },
            ]
          : [],
    } as unknown as QuestTemplateRepository;
    __setTestQuestTemplateRepo(templateRepo);

    // Quest repo: capture quest + objectives + ledger.
    const inserted: { title: string; objectiveIndex?: number }[] = [];
    let questRow: Record<string, unknown> | undefined;
    let idempotencyRecorded = false;
    const questRepo = {
      createQuest: async (_tx: never, data: { title: string }) => {
        questRow = { id: "quest-1", ...data };
        return questRow;
      },
      insertObjective: async (
        _tx: never,
        data: { objectiveIndex: number; title: string },
      ) => {
        inserted.push({
          title: data.title,
          objectiveIndex: data.objectiveIndex,
        });
        return data;
      },
      findObjectivesByQuestId: async () =>
        inserted
          .filter((o) => o.objectiveIndex !== undefined)
          .map((o) => ({
            id: `objective-${o.objectiveIndex}`,
            questId: "quest-1",
            objectiveIndex: o.objectiveIndex,
            title: o.title,
            status: "locked",
            evidenceRef: null,
            completedAt: null,
          })),
      findQuestById: async () => questRow,
      updateQuest: async (
        _tx: never,
        _id: string,
        data: Record<string, unknown>,
      ) => {
        questRow = { ...questRow, ...data };
        return questRow;
      },
      updateObjective: async (_tx: never, _id: string, data: never) => data,
      findIdempotency: async () => undefined,
      recordIdempotency: async () => {
        idempotencyRecorded = true;
        return undefined;
      },
    } as unknown as QuestRepository;
    __setTestQuestSeedAutomationRepo(questRepo);
    __setTestQuestRepo(questRepo);

    const result = await instantiateQuestFromSeed({
      householdId: HOUSEHOLD,
      worldId: WORLD,
      storySessionId: SESSION,
      factId: "lost-letter",
      sourceHookId: HOOK,
    });

    expect(result.created).toBe(true);
    expect(result.quest.title).toBe("The Lost Letter");
    expect(result.quest.status).toBe("active");
    expect(result.quest.objectives).toHaveLength(2);
    expect(idempotencyRecorded).toBe(true);
  });

  it("returns the existing quest when re-run with the same sourceHookId", async () => {
    const templateRepo = {
      createTemplate: async () => undefined,
      findTemplateById: async () => undefined,
      findTemplateByKey: async (_tx: never, key: string) =>
        key === "lost-letter-quest"
          ? {
              id: "template-1",
              templateKey: "lost-letter-quest",
              displayName: "The Lost Letter",
              description: "desc",
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          : undefined,
      listTemplates: async () => [],
      insertTemplateObjective: async () => undefined,
      findTemplateObjectives: async () => [],
    } as unknown as QuestTemplateRepository;
    __setTestQuestTemplateRepo(templateRepo);

    const questRepo = {
      createQuest: async () => undefined,
      insertObjective: async () => undefined,
      findObjectivesByQuestId: async () => [
        {
          id: "o0",
          questId: "quest-1",
          objectiveIndex: 0,
          title: "A",
          status: "locked",
          evidenceRef: null,
          completedAt: null,
        },
      ],
      findQuestById: async () => ({
        id: "quest-1",
        householdId: HOUSEHOLD,
        worldId: WORLD,
        storySessionId: SESSION,
        title: "The Lost Letter",
        summary: "desc",
        status: "active",
        version: 2,
        evidenceRef: "quest:quest-1:activate",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateQuest: async () => undefined,
      updateObjective: async () => undefined,
      findIdempotency: async () => ({
        id: "ledger-1",
        householdId: HOUSEHOLD,
        worldId: WORLD,
        operationType: "quest_seed_automation",
        idempotencyKey: `quest-seed:${HOOK}`,
        resultPayload: { questId: "quest-1" },
        createdAt: new Date(),
      }),
      recordIdempotency: async () => undefined,
    } as unknown as QuestRepository;
    __setTestQuestSeedAutomationRepo(questRepo);
    __setTestQuestRepo(questRepo);

    const result = await instantiateQuestFromSeed({
      householdId: HOUSEHOLD,
      worldId: WORLD,
      storySessionId: SESSION,
      factId: "lost-letter",
      sourceHookId: HOOK,
    });

    expect(result.created).toBe(false);
    expect(result.quest.id).toBe("quest-1");
  });

  it("throws for a missing template", async () => {
    const templateRepo = {
      createTemplate: async () => undefined,
      findTemplateById: async () => undefined,
      findTemplateByKey: async () => undefined,
      listTemplates: async () => [],
      insertTemplateObjective: async () => undefined,
      findTemplateObjectives: async () => [],
    } as unknown as QuestTemplateRepository;
    __setTestQuestTemplateRepo(templateRepo);

    const questRepo = {
      createQuest: async () => undefined,
      insertObjective: async () => undefined,
      findObjectivesByQuestId: async () => [],
      findQuestById: async () => undefined,
      updateQuest: async () => undefined,
      updateObjective: async () => undefined,
      findIdempotency: async () => undefined,
      recordIdempotency: async () => undefined,
    } as unknown as QuestRepository;
    __setTestQuestSeedAutomationRepo(questRepo);
    __setTestQuestRepo(questRepo);

    await expect(
      instantiateQuestFromSeed({
        householdId: HOUSEHOLD,
        worldId: WORLD,
        storySessionId: SESSION,
        factId: "unknown-fact",
        sourceHookId: HOOK,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("assertAutomationInput rejects missing sourceHookId", () => {
    expect(() =>
      assertAutomationInput({
        householdId: HOUSEHOLD,
        worldId: WORLD,
        storySessionId: SESSION,
        factId: "lost-letter",
        sourceHookId: "",
      }),
    ).toThrow();
  });
});
