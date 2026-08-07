import { Quest } from "../domain/quest";
import type { CreateQuestInput, ProgressObjectiveInput } from "../domain/quest";
import type { QuestState, QuestObjectiveState } from "../domain/world-types";
import { NotFoundError } from "../domain/errors";
import { DrizzleQuestRepository } from "../db/repositories/drizzle/drizzle-quest.repository";
import type { QuestRepository } from "../db/repositories/interfaces/quest.repository";
import { getWorldDb } from "./db";
import type { Database } from "../db/client";

let testDb: Database | undefined;
let testRepo: QuestRepository | undefined;

export function __setTestQuestDb(db: Database | undefined): void {
  testDb = db;
}

export function __setTestQuestRepo(repo: QuestRepository | undefined): void {
  testRepo = repo;
}

function getDb(): Database {
  return testDb ?? getWorldDb();
}

function getRepo(): QuestRepository {
  return testRepo ?? new DrizzleQuestRepository();
}

function objectiveStateFromRow(row: {
  id: string;
  objectiveIndex: number;
  title: string;
  status: string;
  evidenceRef: string | null;
  completedAt: Date | null;
}): QuestObjectiveState {
  return {
    index: row.objectiveIndex,
    title: row.title,
    status: row.status as QuestObjectiveState["status"],
    evidenceRef: row.evidenceRef,
    completedAt: row.completedAt,
  };
}

function questStateFromRows(
  quest: {
    id: string;
    householdId: string;
    worldId: string;
    storySessionId: string | null;
    title: string;
    summary: string;
    status: string;
    version: number;
    evidenceRef: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  objectives: {
    id: string;
    objectiveIndex: number;
    title: string;
    status: string;
    evidenceRef: string | null;
    completedAt: Date | null;
  }[],
): QuestState {
  return {
    id: quest.id,
    householdId: quest.householdId,
    worldId: quest.worldId,
    storySessionId: quest.storySessionId,
    title: quest.title,
    summary: quest.summary,
    status: quest.status as QuestState["status"],
    version: quest.version,
    evidenceRef: quest.evidenceRef,
    createdAt: quest.createdAt,
    updatedAt: quest.updatedAt,
    objectives: objectives.map(objectiveStateFromRow),
  };
}

export async function createQuest(
  input: CreateQuestInput,
): Promise<QuestState> {
  const db = getDb();
  const repo = getRepo();

  const quest = Quest.create(input);

  const result = await db.transaction(async (tx) => {
    const state = quest.getState();
    const questRecord = await repo.createQuest(tx, {
      id: state.id,
      householdId: state.householdId,
      worldId: state.worldId,
      storySessionId: state.storySessionId,
      title: state.title,
      summary: state.summary,
      status: state.status,
      version: state.version,
      evidenceRef: state.evidenceRef,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    });

    for (const objective of state.objectives) {
      await repo.insertObjective(tx, {
        id: crypto.randomUUID(),
        questId: state.id,
        objectiveIndex: objective.index,
        title: objective.title,
        status: objective.status,
        evidenceRef: objective.evidenceRef,
        completedAt: objective.completedAt,
      });
    }

    return questRecord;
  });

  const objectives = await repo.findObjectivesByQuestId(db, result.id);
  return questStateFromRows(result, objectives);
}

async function loadQuestState(
  repo: QuestRepository,
  tx: { select: Database["select"] },
  questId: string,
): Promise<QuestState> {
  const quest = await repo.findQuestById(tx, questId);
  if (!quest) throw new NotFoundError("Quest", questId);
  const objectives = await repo.findObjectivesByQuestId(tx, questId);
  return questStateFromRows(quest, objectives);
}

export async function activateQuest(questId: string): Promise<QuestState> {
  const db = getDb();
  const repo = getRepo();

  return db.transaction(async (tx) => {
    const quest = Quest.fromState(await loadQuestState(repo, tx, questId));
    const evidenceRef = `quest:${questId}:activate`;
    quest.activate(evidenceRef);
    const state = quest.getState();
    await repo.updateQuest(tx, questId, {
      status: state.status,
      version: state.version,
      evidenceRef: state.evidenceRef,
      updatedAt: state.updatedAt,
    });
    return state;
  });
}

export async function progressObjective(
  questId: string,
  input: ProgressObjectiveInput,
): Promise<QuestState> {
  const db = getDb();
  const repo = getRepo();

  return db.transaction(async (tx) => {
    const quest = Quest.fromState(await loadQuestState(repo, tx, questId));
    quest.progressObjective(input);
    const state = quest.getState();
    await repo.updateQuest(tx, questId, {
      status: state.status,
      version: state.version,
      evidenceRef: state.evidenceRef,
      updatedAt: state.updatedAt,
    });
    const objectiveRow = (await repo.findObjectivesByQuestId(tx, questId))[
      input.objectiveIndex
    ];
    if (objectiveRow) {
      const updated = state.objectives[input.objectiveIndex];
      if (!updated) {
        throw new NotFoundError("QuestObjective", String(input.objectiveIndex));
      }
      await repo.updateObjective(tx, objectiveRow.id, {
        status: updated.status,
        evidenceRef: updated.evidenceRef,
        completedAt: updated.completedAt,
      });
    }
    return state;
  });
}

export async function pauseQuest(questId: string): Promise<QuestState> {
  const db = getDb();
  const repo = getRepo();

  return db.transaction(async (tx) => {
    const quest = Quest.fromState(await loadQuestState(repo, tx, questId));
    const evidenceRef = `quest:${questId}:pause`;
    quest.pause(evidenceRef);
    const state = quest.getState();
    await repo.updateQuest(tx, questId, {
      status: state.status,
      version: state.version,
      evidenceRef: state.evidenceRef,
      updatedAt: state.updatedAt,
    });
    return state;
  });
}

export async function resumeQuest(questId: string): Promise<QuestState> {
  const db = getDb();
  const repo = getRepo();

  return db.transaction(async (tx) => {
    const quest = Quest.fromState(await loadQuestState(repo, tx, questId));
    const evidenceRef = `quest:${questId}:resume`;
    quest.resume(evidenceRef);
    const state = quest.getState();
    await repo.updateQuest(tx, questId, {
      status: state.status,
      version: state.version,
      evidenceRef: state.evidenceRef,
      updatedAt: state.updatedAt,
    });
    return state;
  });
}

export async function abandonQuest(questId: string): Promise<QuestState> {
  const db = getDb();
  const repo = getRepo();

  return db.transaction(async (tx) => {
    const quest = Quest.fromState(await loadQuestState(repo, tx, questId));
    const evidenceRef = `quest:${questId}:abandon`;
    quest.abandon(evidenceRef);
    const state = quest.getState();
    await repo.updateQuest(tx, questId, {
      status: state.status,
      version: state.version,
      evidenceRef: state.evidenceRef,
      updatedAt: state.updatedAt,
    });
    return state;
  });
}

export async function getQuestById(
  questId: string,
): Promise<QuestState | null> {
  const db = getDb();
  const repo = getRepo();
  const quest = await repo.findQuestById(db, questId);
  if (!quest) return null;
  const objectives = await repo.findObjectivesByQuestId(db, questId);
  return questStateFromRows(quest, objectives);
}

export async function getQuestsByWorldId(
  worldId: string,
): Promise<QuestState[]> {
  const db = getDb();
  const repo = getRepo();
  const quests = await repo.findQuestsByWorldId(db, worldId);
  const results: QuestState[] = [];
  for (const quest of quests) {
    const objectives = await repo.findObjectivesByQuestId(db, quest.id);
    results.push(questStateFromRows(quest, objectives));
  }
  return results;
}

export async function getQuestsBySessionId(
  storySessionId: string,
): Promise<QuestState[]> {
  const db = getDb();
  const repo = getRepo();
  const quests = await repo.findQuestsBySessionId(db, storySessionId);
  const results: QuestState[] = [];
  for (const quest of quests) {
    const objectives = await repo.findObjectivesByQuestId(db, quest.id);
    results.push(questStateFromRows(quest, objectives));
  }
  return results;
}
