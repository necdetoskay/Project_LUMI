import { Quest } from "../domain/quest";
import type { QuestObjectiveState, QuestState } from "../domain/world-types";
import { NotFoundError } from "../domain/errors";
import { DrizzleQuestRepository } from "../db/repositories/drizzle/drizzle-quest.repository";
import type { QuestRepository } from "../db/repositories/interfaces/quest.repository";
import { getWorldDb } from "./db";
import type { Database } from "../db/client";

let testDb: Database | undefined;
let testRepo: QuestRepository | undefined;

export function __setTestQuestChangeDb(db: Database | undefined): void {
  testDb = db;
}

export function __setTestQuestChangeRepo(
  repo: QuestRepository | undefined,
): void {
  testRepo = repo;
}

function getDb(): Database {
  return testDb ?? getWorldDb();
}

function getRepo(): QuestRepository {
  return testRepo ?? new DrizzleQuestRepository();
}

/**
 * A quest-bound world change produced by the story commit pipeline. This is
 * the world-side view of a `quest_state_update` outcome: the `@lumi/story`
 * commit writes an entityKind-agnostic `WorldChange`; audiences apply it to
 * the quest read model here, idempotently per `questId::objectiveIndex`.
 */
export interface QuestWorldChangeInput {
  questId: string;
  objectiveIndex: number;
  /** Objective status to apply (e.g. "completed"). */
  status: QuestObjectiveState["status"];
  /** Evidence reference carried through from the committed outcome. */
  evidenceRef: string;
}

export type ApplyQuestChangeResult = "applied" | "skipped";

function objectiveStateFromRow(
  row: {
    id: string;
    objectiveIndex: number;
    title: string;
    status: string;
    evidenceRef: string | null;
    completedAt: Date | null;
  },
): QuestObjectiveState {
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

/**
 * Applies a `QuestWorldChange` produced by the story world-commit pipeline to
 * the quest read model. Guards are enforced by the domain (only `active`
 * quests can be mutated; objective transitions are deterministic). Idempotent
 * per `questId::objectiveIndex` — re-applying an already-completed objective
 * with the same evidence is a no-op (`skipped`).
 */
export function applyQuestChange(
  input: QuestWorldChangeInput,
): Promise<ApplyQuestChangeResult> {
  return getDb().transaction(async (tx) => {
    const repo = getRepo();
    const state = await loadQuestState(repo, tx, input.questId);
    const objective = state.objectives[input.objectiveIndex];
    if (!objective) {
      throw new NotFoundError(
        "QuestObjective",
        `${input.questId}::${input.objectiveIndex}`,
      );
    }

    if (
      objective.status === input.status &&
      objective.evidenceRef === input.evidenceRef
    ) {
      return "skipped";
    }

    const quest = Quest.fromState(state);
    quest.progressObjective({
      objectiveIndex: input.objectiveIndex,
      evidenceRef: input.evidenceRef,
    });
    const after = quest.getState();

    await repo.updateQuest(tx, input.questId, {
      status: after.status,
      version: after.version,
      evidenceRef: after.evidenceRef,
      updatedAt: after.updatedAt,
    });

    const rows = await repo.findObjectivesByQuestId(tx, input.questId);
    const updated = after.objectives[input.objectiveIndex];
    if (!updated) {
      throw new NotFoundError(
        "QuestObjective",
        String(input.objectiveIndex),
      );
    }
    const targetRow = rows[input.objectiveIndex];
    if (!targetRow) {
      throw new NotFoundError(
        "QuestObjective",
        `${input.questId}::${input.objectiveIndex}`,
      );
    }
    await repo.updateObjective(tx, targetRow.id, {
      status: updated.status,
      evidenceRef: updated.evidenceRef,
      completedAt: updated.completedAt,
    });

    return "applied";
  });
}