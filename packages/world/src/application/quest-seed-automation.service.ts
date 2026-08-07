import { QuestSeedTemplateResolver } from "../domain/quest-seed-template-resolver";
import { NotFoundError, ValidationError } from "../domain/errors";
import { DrizzleQuestRepository } from "../db/repositories/drizzle/drizzle-quest.repository";
import type { QuestRepository } from "../db/repositories/interfaces/quest.repository";
import { getWorldDb } from "./db";
import type { Database } from "../db/client";
import type { QuestState, QuestObjectiveState } from "../domain/world-types";
import { getQuestTemplateByKey } from "./quest-template.service";
import {
  activateQuest,
  createQuest as createQuestInstance,
} from "./quest.service";

let testDb: Database | undefined;
let testRepo: QuestRepository | undefined;

export function __setTestQuestSeedAutomationDb(db: Database | undefined): void {
  testDb = db;
}

export function __setTestQuestSeedAutomationRepo(
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

export const QUEST_SEED_OPERATION_TYPE = "quest_seed_automation";

export interface QuestSeedAutomationInput {
  householdId: string;
  worldId: string;
  storySessionId: string;
  childProfileId?: string | null;
  /** factId carried by the accepted quest_seed opportunity evidence (S25). */
  factId: string;
  /** Correlator: the story hook id that triggered automation (idempotency). */
  sourceHookId: string;
}

export interface QuestSeedAutomationResult {
  quest: QuestState;
  created: boolean;
}

function objectiveStateFromRow(row: {
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
    reward: unknown;
    createdAt: Date;
    updatedAt: Date;
  },
  objectives: {
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
    reward: (quest.reward as QuestState["reward"]) ?? null,
    createdAt: quest.createdAt,
    updatedAt: quest.updatedAt,
    objectives: objectives.map(objectiveStateFromRow),
  };
}

/**
 * Idempotently instantiates and activates a Quest from an authored template
 * for an accepted quest_seed. Deterministic: the template is chosen from the
 * seeded registry via the opportunity's factId; re-running with the same
 * sourceHookId returns the same quest without duplicating (ledger keyed
 * `quest-seed:<sourceHookId>`).
 */
export async function instantiateQuestFromSeed(
  input: QuestSeedAutomationInput,
): Promise<QuestSeedAutomationResult> {
  const db = getDb();
  const repo = getRepo();

  const idempotencyKey = `quest-seed:${input.sourceHookId}`;

  return db.transaction(async (tx) => {
    const existing = await repo.findIdempotency(
      tx,
      input.householdId,
      input.worldId,
      QUEST_SEED_OPERATION_TYPE,
      idempotencyKey,
    );

    if (existing) {
      const questId = String(
        (existing.resultPayload as { questId?: unknown }).questId ?? "",
      );
      const quest = await repo.findQuestById(tx, questId);
      if (!quest) {
        throw new NotFoundError("Quest", questId);
      }
      const objectives = await repo.findObjectivesByQuestId(tx, questId);
      return { quest: questStateFromRows(quest, objectives), created: false };
    }

    const templateKey = QuestSeedTemplateResolver.resolve(input.factId);
    const template = await getQuestTemplateByKey(templateKey);
    if (!template) {
      throw new NotFoundError("QuestTemplate", templateKey);
    }

    const created = await createQuestInstance({
      householdId: input.householdId,
      worldId: input.worldId,
      storySessionId: input.storySessionId,
      title: template.displayName,
      summary: template.description,
      objectives: template.objectives.map((o) => ({ title: o.title })),
      reward: template.reward,
    });

    const activated = await activateQuest(created.id);

    await repo.recordIdempotency(tx, {
      id: crypto.randomUUID(),
      householdId: input.householdId,
      worldId: input.worldId,
      operationType: QUEST_SEED_OPERATION_TYPE,
      idempotencyKey,
      resultPayload: { questId: created.id, templateKey },
      createdAt: new Date(),
    });

    return { quest: activated, created: true };
  });
}

/**
 * Validates that the factId is non-empty before automation. Throws a domain
 * validation error so the caller (applicator) can mark the intent failed.
 */
export function assertAutomationInput(input: QuestSeedAutomationInput): void {
  if (!input.sourceHookId || input.sourceHookId.trim() === "") {
    throw new ValidationError(
      "QUEST_SEED_MISSING_SOURCE_HOOK",
      "sourceHookId is required for quest seed automation",
      "sourceHookId",
    );
  }
  if (!input.householdId || input.householdId.trim() === "") {
    throw new ValidationError(
      "QUEST_SEED_MISSING_HOUSEHOLD",
      "householdId is required for quest seed automation",
      "householdId",
    );
  }
}
