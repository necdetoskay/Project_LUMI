import { DrizzlePromptRepository } from "../db/repositories/drizzle/drizzle-prompt.repository";
import type { PromptRepository } from "../db/repositories/interfaces/prompt.repository";
import { PromptRegistry, PromptVersion } from "../domain";
import { NotFoundError, ValidationError } from "../domain/errors";
import type { PromptVariableDefinition } from "../domain/prompt-variable";
import { assertKnownPromptVersionStatus } from "../domain/prompt-types";
import type { Database } from "../db/client";
import { getPromptDb } from "./db";
import { renderPrompt, type RenderedPrompt } from "./rendering/prompt-renderer";

let testDb: Database | undefined;
let testRepo: PromptRepository | undefined;

export function __setTestPromptDb(db: Database | undefined): void {
  testDb = db;
}

export function __setTestPromptRepository(repo: PromptRepository | undefined): void {
  testRepo = repo;
}

function getDb(): Database {
  return testDb ?? getPromptDb();
}

function getRepo(): PromptRepository {
  return testRepo ?? new DrizzlePromptRepository();
}

export interface CreatePromptRegistryServiceInput {
  householdId: string;
  promptKey: string;
  purpose?: string | undefined;
}

export interface CreatePromptVersionServiceInput {
  registryId: string;
  versionNumber: number;
  templateBody: string;
  variableSchema?: PromptVariableDefinition[] | undefined;
  modelPreferences?: Record<string, unknown> | undefined;
  outputSchema?: Record<string, unknown> | undefined;
}

export async function createPromptRegistry(input: CreatePromptRegistryServiceInput) {
  const db = getDb();
  const repo = getRepo();
  const registry = PromptRegistry.create(input);
  const state = registry.getState();
  return repo.createRegistry(db, {
    id: state.id,
    householdId: state.householdId,
    promptKey: state.promptKey,
    purpose: state.purpose,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  });
}

export async function createPromptVersion(input: CreatePromptVersionServiceInput) {
  const db = getDb();
  const repo = getRepo();
  const version = PromptVersion.create(input);
  const state = version.getState();
  return repo.createVersion(db, {
    id: state.id,
    registryId: state.registryId,
    versionNumber: state.versionNumber,
    status: state.status,
    templateBody: state.templateBody,
    variableSchema: state.variableSchema,
    modelPreferences: state.modelPreferences,
    outputSchema: state.outputSchema,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    publishedAt: state.publishedAt,
    archivedAt: state.archivedAt,
  });
}

export async function publishPromptVersion(versionId: string) {
  const db = getDb();
  const repo = getRepo();

  const record = await repo.getVersionById(db, versionId);
  if (!record) {
    throw new NotFoundError("PromptVersion", versionId);
  }

  assertKnownPromptVersionStatus(record.status);
  const version = PromptVersion.fromState({
    ...record,
    status: record.status,
    variableSchema: asVariableDefinitions(record.variableSchema),
    modelPreferences: asObject(record.modelPreferences),
    outputSchema: asObject(record.outputSchema),
    publishedAt: record.publishedAt ?? null,
    archivedAt: record.archivedAt ?? null,
  });

  version.publish();

  return repo.publishVersion(db, versionId);
}

export async function activatePromptVersion(
  registryId: string,
  versionId: string,
  householdId: string,
) {
  const db = getDb();
  const repo = getRepo();

  const versionRecord = await repo.getVersionById(db, versionId);
  if (!versionRecord) {
    throw new NotFoundError("PromptVersion", versionId);
  }

  assertKnownPromptVersionStatus(versionRecord.status);
  const version = PromptVersion.fromState({
    ...versionRecord,
    status: versionRecord.status,
    variableSchema: asVariableDefinitions(versionRecord.variableSchema),
    modelPreferences: asObject(versionRecord.modelPreferences),
    outputSchema: asObject(versionRecord.outputSchema),
    publishedAt: versionRecord.publishedAt ?? null,
    archivedAt: versionRecord.archivedAt ?? null,
  });

  if (!version.isPublished()) {
    throw new ValidationError("VERSION_NOT_PUBLISHED", "Only published versions can be activated");
  }

  return db.transaction(async (tx) =>
    repo.activateVersion(tx, registryId, versionId, householdId),
  );
}

export async function getActivePromptVersion(registryId: string) {
  const db = getDb();
  const repo = getRepo();
  return repo.getActiveVersion(db, registryId);
}

export async function renderActivePrompt(
  registryId: string,
  values: Record<string, unknown>,
): Promise<RenderedPrompt> {
  const db = getDb();
  const repo = getRepo();

  const record = await repo.getActiveVersion(db, registryId);
  if (!record) {
    throw new NotFoundError("ActivePromptVersion", registryId);
  }

  assertKnownPromptVersionStatus(record.status);
  const version = PromptVersion.fromState({
    ...record,
    status: record.status,
    variableSchema: asVariableDefinitions(record.variableSchema),
    modelPreferences: asObject(record.modelPreferences),
    outputSchema: asObject(record.outputSchema),
    publishedAt: record.publishedAt ?? null,
    archivedAt: record.archivedAt ?? null,
  });

  version.assertRenderable();

  return renderPrompt(version.templateBody, version.id, version.variableSchema, values);
}

function asVariableDefinitions(value: unknown): PromptVariableDefinition[] {
  if (Array.isArray(value)) {
    return value as PromptVariableDefinition[];
  }
  return [];
}

function asObject(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
