import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import type { Database } from "../db/client";
import { NotFoundError, ValidationError } from "../domain/errors";
import type { GeneratedScene } from "./story-scene-output";
import { getStoryDb } from "./db";
import { hashObject } from "./hash";
import { advanceSession } from "./story-session.service";

let testDb: Database | undefined;

export function __setTestGeneratedSceneDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

export interface PersistGeneratedSceneAndAdvanceInput {
  sessionId: string;
  expectedVersion: number;
  scene: GeneratedScene;
  modelId?: string | null;
  sourceHookId?: string | null;
  actorUserId?: string | undefined;
  contextSnapshot?: Record<string, unknown> | undefined;
  idempotencyKey?: string | undefined;
}

export interface PersistGeneratedSceneAndAdvanceResult {
  generatedSceneId: string;
  generatedSceneKey: string;
  reusedPersistedScene: boolean;
  playbackState: Awaited<ReturnType<typeof advanceSession>>;
}

/**
 * Production bridge between StorySceneGenerationService and the existing
 * session reader/progression path.
 *
 * The generated prose is first materialized as a normal story_scenes record,
 * then handed to the canonical advanceSession flow. A deterministic scene key
 * makes retries safe: if persistence succeeded but the later advance failed,
 * the next attempt reuses the already-written generated scene rather than
 * creating duplicate prose rows.
 *
 * Session advancement itself remains owned by advanceSession, preserving its
 * optimistic-version check, scene visit, checkpoint, event and optional world
 * outcome semantics.
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
  if (session.version !== input.expectedVersion) {
    throw new ValidationError(
      "VERSION_CONFLICT",
      "Session version conflict; generated scene was not persisted",
    );
  }

  const sourceFingerprint = await hashObject({
    sessionId: input.sessionId,
    generatedSceneId: input.scene.sceneId,
    sourceHookId: input.sourceHookId ?? null,
    narrative: input.scene.narrative,
  });
  const generatedSceneKey = `generated:${input.sessionId}:${sourceFingerprint}`;

  const existingScenes = await repo.findScenesByVersion(db, session.storyVersionId);
  const existing = existingScenes.find((scene) => scene.sceneKey === generatedSceneKey);

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
        sceneType: "narrative",
        title: input.scene.setting.slice(0, 300),
        narrativeText: input.scene.narrative,
        isEntryScene: false,
        isTerminalScene: false,
        metadata: {
          generated: true,
          generatedForSessionId: input.sessionId,
          sourceGeneratedSceneId: input.scene.sceneId,
          sourceHookId: input.sourceHookId ?? null,
          modelId: input.modelId ?? null,
          setting: input.scene.setting,
          characters: input.scene.characters,
          moment: input.scene.moment,
          nextPrompt: input.scene.nextPrompt,
        },
      });
    });
  }

  const playbackState = await advanceSession({
    sessionId: input.sessionId,
    expectedVersion: input.expectedVersion,
    nextSceneId: generatedSceneId,
    idempotencyKey:
      input.idempotencyKey ?? `generated-scene-advance:${generatedSceneKey}`,
    actorUserId: input.actorUserId,
    contextSnapshot: input.contextSnapshot,
  });

  return {
    generatedSceneId,
    generatedSceneKey,
    reusedPersistedScene,
    playbackState,
  };
}
