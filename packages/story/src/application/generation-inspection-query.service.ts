import type { ContextInspectorProjection } from "@lumi/context";
import { desc, eq } from "drizzle-orm";

import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import {
  storyGenerationInspections,
  type StoryGenerationInspectionRecord,
} from "../db/schema/story";
import { NotFoundError, ValidationError } from "../domain/errors";
import { getStoryDb } from "./db";

export interface GenerationInspectionListItem {
  inspectionId: string;
  storySessionId: string;
  generatedSceneId: string;
  sourceHookId: string | null;
  modelId: string;
  attempt: number;
  contextContentHash: string;
  schemaVersion: number;
  createdAt: string;
  tokenUsage: ContextInspectorProjection["tokenUsage"];
  summary: ContextInspectorProjection["summary"];
  sections: Array<{
    name: string;
    priority: number;
    tokensUsed: number;
    truncated: boolean;
    itemCount: number;
  }>;
}

export interface GenerationInspectionSessionItem {
  storySessionId: string;
  childProfileId: string;
  worldId: string;
  storyDefinitionId: string;
  storyTitle: string | null;
  sessionStatus: string;
  inspectionCount: number;
  latestInspectionAt: string;
  latestModelId: string;
}

export interface GenerationInspectionDetail
  extends GenerationInspectionListItem {
  request: ContextInspectorProjection["request"];
  findings: ContextInspectorProjection["findings"];
  sections: ContextInspectorProjection["sections"];
}

function projectionOf(
  record: StoryGenerationInspectionRecord,
): ContextInspectorProjection {
  const projection = record.inspectorProjection as ContextInspectorProjection;
  if (
    !projection ||
    typeof projection !== "object" ||
    !projection.contentHash ||
    !projection.tokenUsage ||
    !projection.summary ||
    !Array.isArray(projection.sections) ||
    !Array.isArray(projection.findings)
  ) {
    throw new ValidationError(
      "INVALID_GENERATION_INSPECTION",
      `Generation inspection ${record.id} has an invalid inspector projection`,
    );
  }
  return projection;
}

function toListItem(
  record: StoryGenerationInspectionRecord,
): GenerationInspectionListItem {
  const projection = projectionOf(record);
  return {
    inspectionId: record.id,
    storySessionId: record.storySessionId,
    generatedSceneId: record.generatedSceneId,
    sourceHookId: record.sourceHookId,
    modelId: record.modelId,
    attempt: record.attempt,
    contextContentHash: record.contextContentHash,
    schemaVersion: record.schemaVersion,
    createdAt: record.createdAt.toISOString(),
    tokenUsage: projection.tokenUsage,
    summary: projection.summary,
    sections: projection.sections.map((section) => ({
      name: section.name,
      priority: section.priority,
      tokensUsed: section.tokensUsed,
      truncated: section.truncated,
      itemCount: section.itemCount,
    })),
  };
}

export async function listGenerationInspectionSessions(input: {
  householdId: string;
}): Promise<GenerationInspectionSessionItem[]> {
  const db = getStoryDb();
  const repo = new DrizzleStoryRepository();
  const records = await db
    .select()
    .from(storyGenerationInspections)
    .where(eq(storyGenerationInspections.householdId, input.householdId))
    .orderBy(desc(storyGenerationInspections.createdAt));

  const grouped = new Map<
    string,
    { count: number; latest: StoryGenerationInspectionRecord }
  >();
  for (const record of records) {
    const current = grouped.get(record.storySessionId);
    if (current) {
      current.count += 1;
    } else {
      grouped.set(record.storySessionId, { count: 1, latest: record });
    }
  }

  const sessions = await Promise.all(
    [...grouped.entries()].map(async ([storySessionId, group]) => {
      const session = await repo.findSessionById(db, storySessionId);
      if (!session || session.householdId !== input.householdId) return null;
      const definition = await repo.findDefinitionById(
        db,
        session.storyDefinitionId,
      );
      return {
        storySessionId,
        childProfileId: session.childProfileId,
        worldId: session.worldId,
        storyDefinitionId: session.storyDefinitionId,
        storyTitle: definition?.title ?? null,
        sessionStatus: session.sessionStatus,
        inspectionCount: group.count,
        latestInspectionAt: group.latest.createdAt.toISOString(),
        latestModelId: group.latest.modelId,
      } satisfies GenerationInspectionSessionItem;
    }),
  );

  return sessions.filter(
    (session): session is GenerationInspectionSessionItem => session !== null,
  );
}

export async function listGenerationInspections(input: {
  householdId: string;
  storySessionId: string;
}): Promise<GenerationInspectionListItem[]> {
  const db = getStoryDb();
  const repo = new DrizzleStoryRepository();
  const session = await repo.findSessionById(db, input.storySessionId);
  if (!session || session.householdId !== input.householdId) {
    throw new NotFoundError("StorySession", input.storySessionId);
  }

  const records = await repo.findGenerationInspectionsBySession(
    db,
    input.storySessionId,
  );
  return records.map(toListItem);
}

export async function getGenerationInspection(input: {
  householdId: string;
  storySessionId: string;
  generatedSceneId: string;
}): Promise<GenerationInspectionDetail> {
  const db = getStoryDb();
  const repo = new DrizzleStoryRepository();
  const session = await repo.findSessionById(db, input.storySessionId);
  if (!session || session.householdId !== input.householdId) {
    throw new NotFoundError("StorySession", input.storySessionId);
  }

  const record = await repo.findGenerationInspectionByScene(
    db,
    input.generatedSceneId,
  );
  if (!record || record.storySessionId !== input.storySessionId) {
    throw new NotFoundError(
      "StoryGenerationInspection",
      input.generatedSceneId,
    );
  }

  const projection = projectionOf(record);
  return {
    ...toListItem(record),
    request: projection.request,
    findings: projection.findings,
    sections: projection.sections,
  };
}
