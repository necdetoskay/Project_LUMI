import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import type { Database } from "../db/client";
import { StoryDefinition, StoryVersion } from "../domain";
import { NotFoundError, ValidationError } from "../domain/errors";
import {
  assertKnownLifecycle,
  assertKnownSourceType,
  assertKnownStoryMode,
  assertKnownStoryType,
  assertKnownStoryVersionStatus,
} from "../domain/story-types";
import type { StoryMode } from "../domain/story-types";
import { getStoryDb } from "./db";
import {
  saveSceneGraph,
  type SceneGraphInput,
  type TransitionGraphInput,
} from "./story-definition.service";

let testDb: Database | undefined;

export function __setTestTemplateAuthoringDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

async function getOwnedDefinition(householdId: string, storyDefinitionId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const definition = await repo.findDefinitionById(db, storyDefinitionId);
  if (!definition) {
    throw new NotFoundError("StoryDefinition", storyDefinitionId);
  }
  if (definition.householdId !== householdId) {
    throw new ValidationError(
      "STORY_TEMPLATE_FORBIDDEN",
      "Story definition does not belong to this household",
    );
  }
  return definition;
}

export async function listStoryTemplateVersions(input: {
  householdId: string;
  storyDefinitionId: string;
}) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const definition = await getOwnedDefinition(
    input.householdId,
    input.storyDefinitionId,
  );
  const versions = await repo.findVersionsByDefinition(db, input.storyDefinitionId);
  return { definition, versions };
}

export interface CreateStoryTemplateRevisionInput {
  householdId: string;
  storyDefinitionId: string;
  sourceVersionId?: string | undefined;
  title?: string | undefined;
  storyMode?: StoryMode | undefined;
  scenes?: SceneGraphInput[] | undefined;
  transitions?: TransitionGraphInput[] | undefined;
}

export async function createStoryTemplateRevision(
  input: CreateStoryTemplateRevisionInput,
) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const definition = await getOwnedDefinition(
    input.householdId,
    input.storyDefinitionId,
  );
  if (definition.lifecycle === "archived") {
    throw new ValidationError(
      "STORY_ARCHIVED",
      "Cannot create a revision for an archived story definition",
    );
  }

  const existingVersions = await repo.findVersionsByDefinition(
    db,
    input.storyDefinitionId,
  );
  const nextVersionNumber =
    existingVersions.reduce(
      (max, version) => Math.max(max, version.versionNumber),
      0,
    ) + 1;

  const sourceVersionId =
    input.sourceVersionId ?? definition.currentPublishedVersionId ?? undefined;
  let sourceVersion = sourceVersionId
    ? await repo.findVersionById(db, sourceVersionId)
    : undefined;

  if (sourceVersion && sourceVersion.storyDefinitionId !== input.storyDefinitionId) {
    throw new ValidationError(
      "STORY_VERSION_SCOPE_MISMATCH",
      "Source version does not belong to the requested story definition",
    );
  }
  if (sourceVersionId && !sourceVersion) {
    throw new NotFoundError("StoryVersion", sourceVersionId);
  }

  const hasReplacementScenes = input.scenes !== undefined;
  const hasReplacementTransitions = input.transitions !== undefined;
  if (hasReplacementScenes !== hasReplacementTransitions) {
    throw new ValidationError(
      "INCOMPLETE_STORY_GRAPH",
      "scenes and transitions must be supplied together",
    );
  }

  let scenes: SceneGraphInput[];
  let transitions: TransitionGraphInput[];

  if (hasReplacementScenes && hasReplacementTransitions) {
    scenes = input.scenes!;
    transitions = input.transitions!;
  } else {
    if (!sourceVersion) {
      throw new ValidationError(
        "SOURCE_VERSION_REQUIRED",
        "A source version or replacement graph is required for a revision",
      );
    }
    const sourceScenes = await repo.findScenesByVersion(db, sourceVersion.id);
    const sourceTransitions = await repo.findTransitionsByVersion(
      db,
      sourceVersion.id,
    );
    const keyBySceneId = new Map(
      sourceScenes.map((scene) => [scene.id, scene.sceneKey]),
    );
    scenes = sourceScenes.map((scene) => ({
      sceneKey: scene.sceneKey,
      sequenceNumber: scene.sequenceNumber,
      sceneType: scene.sceneType,
      ...(scene.title ? { title: scene.title } : {}),
      narrativeText: scene.narrativeText,
      isEntryScene: scene.isEntryScene,
      isTerminalScene: scene.isTerminalScene,
    }));
    transitions = sourceTransitions.map((transition) => {
      const fromSceneKey = keyBySceneId.get(transition.fromSceneId);
      const toSceneKey = keyBySceneId.get(transition.toSceneId);
      if (!fromSceneKey || !toSceneKey) {
        throw new ValidationError(
          "INVALID_SOURCE_GRAPH",
          "Source transition references a scene outside the source graph",
        );
      }
      return {
        fromSceneKey,
        toSceneKey,
        transitionType: transition.transitionType,
        priority: transition.priority,
      };
    });
  }

  const storyMode = input.storyMode ?? sourceVersion?.storyMode ?? "interactive";
  assertKnownStoryMode(storyMode);
  const version = StoryVersion.create({
    storyDefinitionId: input.storyDefinitionId,
    versionNumber: nextVersionNumber,
    schemaVersion: sourceVersion?.schemaVersion ?? 1,
    title:
      input.title ??
      `${sourceVersion?.title ?? definition.title} / v${nextVersionNumber}`,
    storyMode,
  });
  const state = version.getState();
  const created = await repo.createVersion(db, {
    id: state.id,
    storyDefinitionId: state.storyDefinitionId,
    versionNumber: state.versionNumber,
    publicationStatus: state.publicationStatus,
    schemaVersion: state.schemaVersion,
    title: state.title,
    summary: state.summary,
    storyMode: state.storyMode,
    contentHash: state.contentHash,
    createdAt: state.createdAt,
    frozenAt: state.frozenAt,
    publishedAt: state.publishedAt,
    retiredAt: state.retiredAt,
  });

  const frozen = await saveSceneGraph({
    storyDefinitionId: input.storyDefinitionId,
    storyVersionId: created.id,
    scenes,
    transitions,
  });

  const graph = await repo.findScenesByVersion(db, created.id);
  return {
    storyDefinitionId: input.storyDefinitionId,
    storyVersionId: created.id,
    versionNumber: nextVersionNumber,
    sourceVersionId: sourceVersion?.id ?? null,
    contentHash: frozen.contentHash,
    sceneCount: graph.length,
  };
}

export async function publishStoryTemplateRevision(input: {
  householdId: string;
  storyDefinitionId: string;
  storyVersionId: string;
}) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const definitionRecord = await getOwnedDefinition(
    input.householdId,
    input.storyDefinitionId,
  );
  const versionRecord = await repo.findVersionById(db, input.storyVersionId);
  if (!versionRecord) {
    throw new NotFoundError("StoryVersion", input.storyVersionId);
  }
  if (versionRecord.storyDefinitionId !== input.storyDefinitionId) {
    throw new ValidationError(
      "STORY_VERSION_SCOPE_MISMATCH",
      "Version does not belong to the requested story definition",
    );
  }

  if (
    definitionRecord.currentPublishedVersionId === input.storyVersionId &&
    versionRecord.publicationStatus === "published"
  ) {
    return {
      storyDefinitionId: input.storyDefinitionId,
      storyVersionId: input.storyVersionId,
      publicationStatus: "published" as const,
      replayed: true,
    };
  }

  assertKnownStoryVersionStatus(versionRecord.publicationStatus);
  assertKnownStoryMode(versionRecord.storyMode);
  const version = StoryVersion.fromState({
    ...versionRecord,
    publicationStatus: versionRecord.publicationStatus,
    storyMode: versionRecord.storyMode,
    summary: versionRecord.summary ?? null,
    contentHash: versionRecord.contentHash ?? null,
    frozenAt: versionRecord.frozenAt ?? null,
    publishedAt: versionRecord.publishedAt ?? null,
    retiredAt: versionRecord.retiredAt ?? null,
  });
  version.publish();
  const publishedState = version.getState();

  assertKnownStoryType(definitionRecord.storyType);
  assertKnownSourceType(definitionRecord.sourceType);
  assertKnownLifecycle(definitionRecord.lifecycle);
  const definition = StoryDefinition.fromState({
    ...definitionRecord,
    storyType: definitionRecord.storyType,
    sourceType: definitionRecord.sourceType,
    lifecycle: definitionRecord.lifecycle,
    childProfileId: definitionRecord.childProfileId ?? null,
    currentPublishedVersionId:
      definitionRecord.currentPublishedVersionId ?? null,
    archivedAt: definitionRecord.archivedAt ?? null,
  });
  definition.setCurrentPublishedVersion(input.storyVersionId);
  const definitionState = definition.getState();

  return db.transaction(async (tx) => {
    const previousVersionId = definitionRecord.currentPublishedVersionId;
    if (previousVersionId && previousVersionId !== input.storyVersionId) {
      const previousRecord = await repo.findVersionById(tx, previousVersionId);
      if (previousRecord?.publicationStatus === "published") {
        assertKnownStoryMode(previousRecord.storyMode);
        const previous = StoryVersion.fromState({
          ...previousRecord,
          publicationStatus: "published",
          storyMode: previousRecord.storyMode,
          summary: previousRecord.summary ?? null,
          contentHash: previousRecord.contentHash ?? null,
          frozenAt: previousRecord.frozenAt ?? null,
          publishedAt: previousRecord.publishedAt ?? null,
          retiredAt: previousRecord.retiredAt ?? null,
        });
        previous.retire();
        const retiredState = previous.getState();
        await repo.updateVersion(tx, previousVersionId, {
          publicationStatus: retiredState.publicationStatus,
          retiredAt: retiredState.retiredAt,
        });
      }
    }

    await repo.updateVersion(tx, input.storyVersionId, {
      publicationStatus: publishedState.publicationStatus,
      publishedAt: publishedState.publishedAt,
    });
    await repo.updateDefinition(tx, input.storyDefinitionId, {
      currentPublishedVersionId: definitionState.currentPublishedVersionId,
      lifecycle: definitionState.lifecycle,
      version: definitionState.version,
      updatedAt: definitionState.updatedAt,
    });

    return {
      storyDefinitionId: input.storyDefinitionId,
      storyVersionId: input.storyVersionId,
      publicationStatus: publishedState.publicationStatus,
      retiredVersionId:
        previousVersionId && previousVersionId !== input.storyVersionId
          ? previousVersionId
          : null,
      replayed: false,
    };
  });
}
