import {
  createContextInspectorProjection,
  type ContextManifest,
} from "@lumi/context";

import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import type { Database } from "../db/client";
import type { SceneType } from "../domain/story-types";
import { NotFoundError, ValidationError } from "../domain/errors";
import type { GeneratedScene } from "./story-scene-output";
import { getStoryDb } from "./db";
import { hashObject } from "./hash";
import {
  advanceSession,
  getSessionPlaybackState,
} from "./story-session.service";

let testDb: Database | undefined;

export function __setTestGeneratedSceneDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

export interface GenerationInspectionInput {
  modelId: string;
  attempt: number;
  contextManifest: ContextManifest;
}

export interface PersistGeneratedSceneAndAdvanceInput {
  sessionId: string;
  expectedVersion: number;
  scene: GeneratedScene;
  sceneType?: SceneType;
  modelId?: string | null;
  sourceHookId?: string | null;
  actorUserId?: string | undefined;
  contextSnapshot?: Record<string, unknown> | undefined;
  generationInspection?: GenerationInspectionInput | undefined;
  idempotencyKey?: string | undefined;
}

export interface PersistGeneratedSceneAndAdvanceResult {
  generatedSceneId: string;
  generatedSceneKey: string;
  reusedPersistedScene: boolean;
  playbackState: Awaited<ReturnType<typeof advanceSession>>;
}

export function generatedSceneKeyForSource(input: {
  sessionId: string;
  sourceHookId?: string | null;
  fallbackFingerprint: string;
}): string {
  if (input.sourceHookId) {
    return `generated:hook:${input.sourceHookId}`;
  }
  return `generated:${input.sessionId}:${input.fallbackFingerprint}`;
}

export async function findGeneratedSceneForHook(input: {
  sessionId: string;
  sourceHookId: string;
}) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const session = await repo.findSessionById(db, input.sessionId);
  if (!session) {
    throw new NotFoundError("StorySession", input.sessionId);
  }
  const scenes = await repo.findScenesByVersion(db, session.storyVersionId);
  const sceneKey = generatedSceneKeyForSource({
    sessionId: input.sessionId,
    sourceHookId: input.sourceHookId,
    fallbackFingerprint: "unused",
  });
  return scenes.find((scene) => scene.sceneKey === sceneKey);
}

/**
 * Production bridge between StorySceneGenerationService and the existing
 * session reader/progression path.
 *
 * Hook-backed scenes use the stable source hook id as their persistence key,
 * so retries cannot create different prose rows even when generation uses a
 * fresh nonce. A replay after a successful advance returns the current reader
 * state without requiring the caller to know the newly incremented version.
 */
export async function persistGeneratedSceneAndAdvance(
  input: PersistGeneratedSceneAndAdvanceInput,
): Promise<PersistGeneratedSceneAndAdvanceResult> {
  const db = getDb();
  const repo = new DrizzleStoryRepository();

  const session = await repo.findSessionById(db, input.sessionId);
  if (!session) {
    throw new NotFoundError("StorySession", input.sessionId);
  }

  const sourceFingerprint = await hashObject({
    sessionId: input.sessionId,
    generatedSceneId: input.scene.sceneId,
    sourceHookId: input.sourceHookId ?? null,
    narrative: input.scene.narrative,
  });
  const generatedSceneKey = generatedSceneKeyForSource({
    sessionId: input.sessionId,
    ...(input.sourceHookId !== undefined
      ? { sourceHookId: input.sourceHookId }
      : {}),
    fallbackFingerprint: sourceFingerprint,
  });

  const existingScenes = await repo.findScenesByVersion(
    db,
    session.storyVersionId,
  );
  const existing = existingScenes.find(
    (scene) => scene.sceneKey === generatedSceneKey,
  );

  if (existing && session.currentSceneId === existing.id) {
    return {
      generatedSceneId: existing.id,
      generatedSceneKey,
      reusedPersistedScene: true,
      playbackState: await getSessionPlaybackState(input.sessionId),
    };
  }

  if (session.version !== input.expectedVersion) {
    throw new ValidationError(
      "VERSION_CONFLICT",
      "Session version conflict; generated scene was not persisted",
    );
  }

  let generatedSceneId: string;
  let reusedPersistedScene = false;

  if (existing) {
    generatedSceneId = existing.id;
    reusedPersistedScene = true;
  } else {
    const maxSequence = existingScenes.reduce(
      (max, scene) => Math.max(max, scene.sequenceNumber),
      -1,
    );
    generatedSceneId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await repo.createScene(tx, {
        id: generatedSceneId,
        storyVersionId: session.storyVersionId,
        sceneKey: generatedSceneKey,
        sequenceNumber: maxSequence + 1,
        sceneType: input.sceneType ?? "narrative",
        title: input.scene.setting.slice(0, 300),
        narrativeText: input.scene.narrative,
        isEntryScene: false,
        isTerminalScene: false,
        metadata: {
          generated: true,
          generatedForSessionId: input.sessionId,
          sourceGeneratedSceneId: input.scene.sceneId,
          sourceHookId: input.sourceHookId ?? null,
          modelId: input.modelId ?? input.generationInspection?.modelId ?? null,
          setting: input.scene.setting,
          characters: input.scene.characters,
          moment: input.scene.moment,
          nextPrompt: input.scene.nextPrompt,
          usedContinuityKeys: input.scene.usedContinuityKeys ?? [],
        },
      });

      if (input.generationInspection) {
        const { modelId, attempt, contextManifest } = input.generationInspection;
        await repo.createGenerationInspection(tx, {
          householdId: session.householdId,
          storySessionId: session.id,
          generatedSceneId,
          sourceHookId: input.sourceHookId ?? null,
          modelId,
          attempt,
          contextContentHash: contextManifest.contentHash,
          contextManifest,
          inspectorProjection: createContextInspectorProjection(contextManifest),
          schemaVersion: 1,
        });
      }
    });
  }

  await advanceSession({
    sessionId: input.sessionId,
    expectedVersion: input.expectedVersion,
    nextSceneId: generatedSceneId,
    idempotencyKey:
      input.idempotencyKey ?? `generated-scene-advance:${generatedSceneKey}`,
    actorUserId: input.actorUserId,
    contextSnapshot: input.contextSnapshot,
  });

  const playbackState = await getSessionPlaybackState(input.sessionId);

  return {
    generatedSceneId,
    generatedSceneKey,
    reusedPersistedScene,
    playbackState,
  };
}
