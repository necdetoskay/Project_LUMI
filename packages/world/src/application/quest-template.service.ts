import { QuestTemplate } from "../domain/quest-template";
import type { CreateQuestTemplateInput } from "../domain/quest-template";
import type {
  QuestTemplateState,
  QuestState,
  QuestTemplateObjectiveState,
} from "../domain/world-types";
import { NotFoundError, ValidationError } from "../domain/errors";
import { DrizzleQuestTemplateRepository } from "../db/repositories/drizzle/drizzle-quest-template.repository";
import type { QuestTemplateRepository } from "../db/repositories/interfaces/quest-template.repository";
import { getWorldDb } from "./db";
import type { Database } from "../db/client";
import { createQuest as createQuestInstance } from "./quest.service";

let testDb: Database | undefined;
let testRepo: QuestTemplateRepository | undefined;

export function __setTestQuestTemplateDb(db: Database | undefined): void {
  testDb = db;
}

export function __setTestQuestTemplateRepo(
  repo: QuestTemplateRepository | undefined,
): void {
  testRepo = repo;
}

function getDb(): Database {
  return testDb ?? getWorldDb();
}

function getRepo(): QuestTemplateRepository {
  return testRepo ?? new DrizzleQuestTemplateRepository();
}

function templateStateFromRows(
  template: {
    id: string;
    templateKey: string;
    displayName: string;
    description: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  },
  objectives: {
    objectiveIndex: number;
    objectiveKey: string;
    title: string;
  }[],
): QuestTemplateState {
  return {
    id: template.id,
    templateKey: template.templateKey,
    displayName: template.displayName,
    description: template.description,
    version: template.version,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    objectives: objectives
      .map(
        (o): QuestTemplateObjectiveState => ({
          index: o.objectiveIndex,
          objectiveKey: o.objectiveKey,
          title: o.title,
        }),
      )
      .sort((a, b) => a.index - b.index),
  };
}

export async function createQuestTemplate(
  input: CreateQuestTemplateInput,
): Promise<QuestTemplateState> {
  const db = getDb();
  const repo = getRepo();

  const template = QuestTemplate.create(input);
  const state = template.getState();

  const result = await db.transaction(async (tx) => {
    const existing = await repo.findTemplateByKey(tx, state.templateKey);
    if (existing) {
      throw new ValidationError(
        "QUEST_TEMPLATE_KEY_EXISTS",
        `Quest template key already exists: ${state.templateKey}`,
        "templateKey",
      );
    }
    const record = await repo.createTemplate(tx, {
      id: state.id,
      templateKey: state.templateKey,
      displayName: state.displayName,
      description: state.description,
      version: state.version,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    });
    for (const objective of state.objectives) {
      await repo.insertTemplateObjective(tx, {
        id: crypto.randomUUID(),
        templateId: state.id,
        objectiveIndex: objective.index,
        objectiveKey: objective.objectiveKey,
        title: objective.title,
      });
    }
    return record;
  });

  const objectives = await repo.findTemplateObjectives(db, result.id);
  return templateStateFromRows(result, objectives);
}

export async function getQuestTemplateByKey(
  templateKey: string,
): Promise<QuestTemplateState | null> {
  const db = getDb();
  const repo = getRepo();
  const template = await repo.findTemplateByKey(db, templateKey);
  if (!template) return null;
  const objectives = await repo.findTemplateObjectives(db, template.id);
  return templateStateFromRows(template, objectives);
}

export async function listQuestTemplates(): Promise<QuestTemplateState[]> {
  const db = getDb();
  const repo = getRepo();
  const templates = await repo.listTemplates(db);
  const results: QuestTemplateState[] = [];
  for (const template of templates) {
    const objectives = await repo.findTemplateObjectives(db, template.id);
    results.push(templateStateFromRows(template, objectives));
  }
  return results;
}

export interface InstantiateQuestInput {
  templateKey: string;
  householdId: string;
  worldId: string;
  storySessionId?: string | null;
}

export async function instantiateQuestFromTemplate(
  input: InstantiateQuestInput,
): Promise<QuestState> {
  const template = await getQuestTemplateByKey(input.templateKey);
  if (!template) {
    throw new NotFoundError("QuestTemplate", input.templateKey);
  }

  return createQuestInstance({
    householdId: input.householdId,
    worldId: input.worldId,
    storySessionId: input.storySessionId ?? null,
    title: template.displayName,
    summary: template.description,
    objectives: template.objectives.map((o) => ({
      title: o.title,
    })),
  });
}
