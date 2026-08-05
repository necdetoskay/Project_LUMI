import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import { StorySession } from "../domain";
import { ValidationError, NotFoundError } from "../domain/errors";
import { getStoryDb } from "./db";
import { recordStoryEventWithTx } from "./story-event-store.service";
import { hashObject } from "./hash";
import type { Database } from "../db/client";
import type { ParticipationRole, PlaybackMode } from "../domain/story-types";
import {
  assertKnownSessionStatus,
  assertKnownPlaybackMode,
} from "../domain/story-types";

let testDb: Database | undefined;

export function __setTestSessionDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

export interface StartSessionInput {
  householdId: string;
  childProfileId: string;
  worldId: string;
  storyDefinitionId: string;
  storyVersionId: string;
  characterId: string;
  participationRole?: ParticipationRole | undefined;
  playbackMode?: PlaybackMode | undefined;
  idempotencyKey?: string | undefined;
  actorUserId?: string | undefined;
  contextSnapshot?: Record<string, unknown> | undefined;
}

export interface SessionStateChangeInput {
  sessionId: string;
  expectedVersion: number;
  idempotencyKey?: string | undefined;
  actorUserId?: string | undefined;
  contextSnapshot?: Record<string, unknown> | undefined;
}

export interface AdvanceSessionInput {
  sessionId: string;
  expectedVersion: number;
  nextSceneId: string;
  idempotencyKey?: string | undefined;
  actorUserId?: string | undefined;
  contextSnapshot?: Record<string, unknown> | undefined;
}

export interface AbandonSessionInput {
  sessionId: string;
  expectedVersion: number;
  reason?: string | undefined;
  idempotencyKey?: string | undefined;
  actorUserId?: string | undefined;
  contextSnapshot?: Record<string, unknown> | undefined;
}

async function findVersionEntryScene(
  repo: DrizzleStoryRepository,
  db: Database,
  storyVersionId: string,
) {
  const scenes = await repo.findScenesByVersion(db, storyVersionId);
  const entry = scenes.find((s) => s.isEntryScene);
  if (!entry) {
    throw new ValidationError(
      "NO_ENTRY_SCENE",
      "Story version has no entry scene",
    );
  }
  return entry;
}

async function buildSessionStateHash(
  sessionId: string,
  state: Record<string, unknown>,
): Promise<string> {
  return hashObject({
    sessionId,
    ...state,
  });
}

async function recordIdempotency(
  tx: { insert: Database["insert"] },
  repo: DrizzleStoryRepository,
  householdId: string,
  operationType: string,
  idempotencyKey: string,
  storySessionId: string,
): Promise<void> {
  await repo.recordIdempotency(tx, {
    id: crypto.randomUUID(),
    householdId,
    operationType,
    idempotencyKey,
    storySessionId,
  });
}
async function checkIdempotency(
  db: Database,
  repo: DrizzleStoryRepository,
  householdId: string,
  operationType: string,
  idempotencyKey: string,
): Promise<string | undefined> {
  const existing = await repo.findIdempotencyRecord(
    db,
    householdId,
    operationType,
    idempotencyKey,
  );
  return existing?.storySessionId ?? undefined;
}

async function readSessionPlaybackState(db: Database, sessionId: string) {
  const repo = new DrizzleStoryRepository();
  const session = await repo.findSessionById(db, sessionId);
  if (!session) {
    throw new NotFoundError("StorySession", sessionId);
  }
  const [characters, currentScene, visits, latestCheckpoint] =
    await Promise.all([
      repo.findSessionCharacters(db, sessionId),
      session.currentSceneId
        ? repo.findSceneById(db, session.currentSceneId)
        : Promise.resolve(undefined),
      repo.findSceneVisitsBySession(db, sessionId),
      repo.findLatestCheckpoint(db, sessionId),
    ]);

  return {
    session,
    characters,
    currentScene,
    visits,
    latestCheckpoint,
  };
}

async function getSessionPlaybackStateFromRecord(sessionId: string) {
  return readSessionPlaybackState(getDb(), sessionId);
}
export async function startSession(input: StartSessionInput) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();

  if (input.idempotencyKey) {
    const existingSessionId = await checkIdempotency(
      db,
      repo,
      input.householdId,
      "session_start",
      input.idempotencyKey,
    );
    if (existingSessionId) {
      return getSessionPlaybackStateFromRecord(existingSessionId);
    }
  }

  const version = await repo.findVersionById(db, input.storyVersionId);
  if (!version) {
    throw new NotFoundError("StoryVersion", input.storyVersionId);
  }
  if (version.publicationStatus !== "published") {
    throw new ValidationError(
      "VERSION_NOT_PUBLISHED",
      "Only published story versions can be started",
    );
  }

  const existingActive = await repo.findActiveSessionByChildAndWorld(
    db,
    input.childProfileId,
    input.worldId,
  );
  if (existingActive) {
    throw new ValidationError(
      "SESSION_ALREADY_EXISTS",
      "An active or paused session already exists for this child and world",
    );
  }

  const entryScene = await findVersionEntryScene(
    repo,
    db,
    input.storyVersionId,
  );

  const session = StorySession.create({
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    worldId: input.worldId,
    storyDefinitionId: input.storyDefinitionId,
    storyVersionId: input.storyVersionId,
    playbackMode: input.playbackMode ?? "reading",
  });
  session.start(entryScene.id);
  const state = session.getState();

  const contentHash = await buildSessionStateHash(session.id, {
    sceneId: entryScene.id,
    status: state.sessionStatus,
    version: state.version,
    snapshot: state.contextSnapshot,
  });

  return db.transaction(async (tx) => {
    const record = await repo.createSession(tx, {
      id: state.id,
      householdId: state.householdId,
      childProfileId: state.childProfileId,
      worldId: state.worldId,
      storyDefinitionId: state.storyDefinitionId,
      storyVersionId: state.storyVersionId,
      currentSceneId: state.currentSceneId,
      sessionStatus: state.sessionStatus,
      playbackMode: state.playbackMode,
      startedAt: state.startedAt,
      lastInteractedAt: state.lastInteractedAt,
      pausedAt: state.pausedAt,
      completedAt: state.completedAt,
      abandonmentReason: state.abandonmentReason,
      contextSnapshot: state.contextSnapshot,
      version: state.version,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    });

    await repo.createSessionCharacter(tx, {
      storySessionId: record.id,
      characterId: input.characterId,
      participationRole: input.participationRole ?? "protagonist",
      joinedAt: new Date(),
      initialStateSnapshot: {},
      version: 1,
    });

    await repo.createSceneVisit(tx, {
      id: crypto.randomUUID(),
      storySessionId: record.id,
      sceneId: entryScene.id,
      visitSequence: 0,
      visitReason: "session_start",
      enteredAt: new Date(),
    });

    await repo.createCheckpoint(tx, {
      id: crypto.randomUUID(),
      storySessionId: record.id,
      sceneId: entryScene.id,
      checkpointType: "automatic",
      schemaVersion: 1,
      sessionState: state.contextSnapshot,
      contentHash,
      sequenceNumber: 1,
    });

    await recordStoryEventWithTx(tx, {
      storySessionId: record.id,
      childProfileId: state.childProfileId,
      eventType: "STORY_SESSION_STARTED",
      aggregateVersion: state.version,
      actorHouseholdId: state.householdId,
      payload: {
        storyDefinitionId: state.storyDefinitionId,
        storyVersionId: state.storyVersionId,
        characterId: input.characterId,
        entrySceneId: entryScene.id,
      },
    });

    if (input.idempotencyKey) {
      await recordIdempotency(
        tx,
        repo,
        input.householdId,
        "session_start",
        input.idempotencyKey,
        record.id,
      );
    }

    return getSessionPlaybackStateFromRecord(record.id);
  });
}

function sessionFromRecord(record: {
  id: string;
  householdId: string;
  childProfileId: string;
  worldId: string;
  storyDefinitionId: string;
  storyVersionId: string;
  currentSceneId: string | null;
  sessionStatus: string;
  playbackMode: string;
  startedAt: Date | null;
  lastInteractedAt: Date | null;
  pausedAt: Date | null;
  completedAt: Date | null;
  abandonmentReason: string | null;
  contextSnapshot: unknown;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): StorySession {
  assertKnownSessionStatus(record.sessionStatus);
  assertKnownPlaybackMode(record.playbackMode);
  const contextSnapshot =
    typeof record.contextSnapshot === "object" &&
    record.contextSnapshot !== null
      ? (record.contextSnapshot as Record<string, unknown>)
      : {};
  return StorySession.fromState({
    ...record,
    sessionStatus: record.sessionStatus,
    playbackMode: record.playbackMode,
    contextSnapshot,
  });
}

async function changeSessionState(
  db: Database,
  repo: DrizzleStoryRepository,
  sessionId: string,
  expectedVersion: number,
  mutator: (session: StorySession) => void,
  eventType:
    | "STORY_SESSION_PAUSED"
    | "STORY_SESSION_RESUMED"
    | "STORY_SESSION_COMPLETED"
    | "STORY_SESSION_ABANDONED",
  operationType: string,
  idempotencyKey: string | undefined,
  actorHouseholdId: string,
  childProfileId: string,
  payload: Record<string, unknown>,
  checkpointType?: "automatic" | "manual",
): Promise<Record<string, unknown>> {
  const record = await repo.findSessionById(db, sessionId);
  if (!record) {
    throw new NotFoundError("StorySession", sessionId);
  }

  if (idempotencyKey) {
    const existing = await checkIdempotency(
      db,
      repo,
      actorHouseholdId,
      operationType,
      idempotencyKey,
    );
    if (existing) {
      return getSessionPlaybackStateFromRecord(existing);
    }
  }

  const session = sessionFromRecord(record);
  if (session.version !== expectedVersion) {
    throw new ValidationError(
      "VERSION_CONFLICT",
      "Session version conflict; reload current state",
    );
  }
  mutator(session);
  const newState = session.getState();

  return db.transaction(async (tx) => {
    const updated = await repo.updateSession(
      tx,
      sessionId,
      {
        currentSceneId: newState.currentSceneId,
        sessionStatus: newState.sessionStatus,
        startedAt: newState.startedAt,
        lastInteractedAt: newState.lastInteractedAt,
        pausedAt: newState.pausedAt,
        completedAt: newState.completedAt,
        abandonmentReason: newState.abandonmentReason,
        contextSnapshot: newState.contextSnapshot,
        version: newState.version,
        updatedAt: newState.updatedAt,
      },
      expectedVersion,
    );
    if (!updated) {
      throw new ValidationError(
        "VERSION_CONFLICT",
        "Session version conflict; reload current state",
      );
    }

    if (checkpointType && newState.currentSceneId) {
      const latest = await repo.findLatestCheckpoint(tx, sessionId);
      const sequenceNumber = latest ? latest.sequenceNumber + 1 : 1;
      const contentHash = await buildSessionStateHash(sessionId, {
        sceneId: newState.currentSceneId,
        status: newState.sessionStatus,
        version: newState.version,
        snapshot: newState.contextSnapshot,
      });
      await repo.createCheckpoint(tx, {
        id: crypto.randomUUID(),
        storySessionId: sessionId,
        sceneId: newState.currentSceneId,
        checkpointType,
        schemaVersion: 1,
        sessionState: newState.contextSnapshot,
        contentHash,
        sequenceNumber,
      });
    }

    await recordStoryEventWithTx(tx, {
      storySessionId: sessionId,
      childProfileId,
      eventType,
      aggregateVersion: newState.version,
      actorHouseholdId,
      payload,
    });

    if (idempotencyKey) {
      await recordIdempotency(
        tx,
        repo,
        actorHouseholdId,
        operationType,
        idempotencyKey,
        sessionId,
      );
    }

    return getSessionPlaybackStateFromRecord(sessionId);
  });
}

export async function pauseSession(input: SessionStateChangeInput) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const record = await repo.findSessionById(db, input.sessionId);
  if (!record) {
    throw new NotFoundError("StorySession", input.sessionId);
  }

  return changeSessionState(
    db,
    repo,
    input.sessionId,
    input.expectedVersion,
    (session) => session.pause(),
    "STORY_SESSION_PAUSED",
    "session_pause",
    input.idempotencyKey,
    record.householdId,
    record.childProfileId,
    {},
    "automatic",
  );
}

export async function resumeSession(input: SessionStateChangeInput) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const record = await repo.findSessionById(db, input.sessionId);
  if (!record) {
    throw new NotFoundError("StorySession", input.sessionId);
  }

  return changeSessionState(
    db,
    repo,
    input.sessionId,
    input.expectedVersion,
    (session) => session.resume(),
    "STORY_SESSION_RESUMED",
    "session_resume",
    input.idempotencyKey,
    record.householdId,
    record.childProfileId,
    {},
  );
}

export async function completeSession(input: SessionStateChangeInput) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const record = await repo.findSessionById(db, input.sessionId);
  if (!record) {
    throw new NotFoundError("StorySession", input.sessionId);
  }

  return changeSessionState(
    db,
    repo,
    input.sessionId,
    input.expectedVersion,
    (session) => session.complete(),
    "STORY_SESSION_COMPLETED",
    "session_complete",
    input.idempotencyKey,
    record.householdId,
    record.childProfileId,
    {},
    "automatic",
  );
}

export async function abandonSession(input: AbandonSessionInput) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const record = await repo.findSessionById(db, input.sessionId);
  if (!record) {
    throw new NotFoundError("StorySession", input.sessionId);
  }

  return changeSessionState(
    db,
    repo,
    input.sessionId,
    input.expectedVersion,
    (session) => session.abandon(input.reason),
    "STORY_SESSION_ABANDONED",
    "session_abandon",
    input.idempotencyKey,
    record.householdId,
    record.childProfileId,
    { reason: input.reason },
  );
}

export async function advanceSession(input: AdvanceSessionInput) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const record = await repo.findSessionById(db, input.sessionId);
  if (!record) {
    throw new NotFoundError("StorySession", input.sessionId);
  }

  if (input.idempotencyKey) {
    const existing = await checkIdempotency(
      db,
      repo,
      record.householdId,
      "session_advance",
      input.idempotencyKey,
    );
    if (existing) {
      return getSessionPlaybackStateFromRecord(existing);
    }
  }

  const nextScene = await repo.findSceneById(db, input.nextSceneId);
  if (!nextScene || nextScene.storyVersionId !== record.storyVersionId) {
    throw new NotFoundError("Scene", input.nextSceneId);
  }

  const session = sessionFromRecord(record);
  if (session.version !== input.expectedVersion) {
    throw new ValidationError(
      "VERSION_CONFLICT",
      "Session version conflict; reload current state",
    );
  }
  session.advance(input.nextSceneId);
  const newState = session.getState();

  return db.transaction(async (tx) => {
    const updated = await repo.updateSession(
      tx,
      input.sessionId,
      {
        currentSceneId: newState.currentSceneId,
        sessionStatus: newState.sessionStatus,
        lastInteractedAt: newState.lastInteractedAt,
        contextSnapshot: newState.contextSnapshot,
        version: newState.version,
        updatedAt: newState.updatedAt,
      },
      input.expectedVersion,
    );
    if (!updated) {
      throw new ValidationError(
        "VERSION_CONFLICT",
        "Session version conflict; reload current state",
      );
    }

    const visits = await repo.findSceneVisitsBySession(tx, input.sessionId);
    const nextSequence =
      visits.length > 0
        ? (visits[visits.length - 1]?.visitSequence ?? 0) + 1
        : 0;
    await repo.createSceneVisit(tx, {
      id: crypto.randomUUID(),
      storySessionId: input.sessionId,
      sceneId: input.nextSceneId,
      visitSequence: nextSequence,
      visitReason: "advance",
      enteredAt: new Date(),
    });

    const latest = await repo.findLatestCheckpoint(tx, input.sessionId);
    const checkpointSequence = latest ? latest.sequenceNumber + 1 : 1;
    const contentHash = await buildSessionStateHash(input.sessionId, {
      sceneId: input.nextSceneId,
      status: newState.sessionStatus,
      version: newState.version,
      snapshot: newState.contextSnapshot,
    });
    await repo.createCheckpoint(tx, {
      id: crypto.randomUUID(),
      storySessionId: input.sessionId,
      sceneId: input.nextSceneId,
      checkpointType: "automatic",
      schemaVersion: 1,
      sessionState: newState.contextSnapshot,
      contentHash,
      sequenceNumber: checkpointSequence,
    });

    await recordStoryEventWithTx(tx, {
      storySessionId: input.sessionId,
      childProfileId: record.childProfileId,
      eventType: "STORY_SCENE_ENTERED",
      aggregateVersion: newState.version,
      actorHouseholdId: record.householdId,
      payload: {
        sceneId: input.nextSceneId,
      },
    });

    if (input.idempotencyKey) {
      await recordIdempotency(
        tx,
        repo,
        record.householdId,
        "session_advance",
        input.idempotencyKey,
        input.sessionId,
      );
    }

    return getSessionPlaybackStateFromRecord(input.sessionId);
  });
}

export async function getSessionPlaybackState(sessionId: string) {
  return getSessionPlaybackStateFromRecord(sessionId);
}

export async function getSessionHistory(sessionId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const record = await repo.findSessionById(db, sessionId);
  if (!record) {
    throw new NotFoundError("StorySession", sessionId);
  }
  const [visits, events] = await Promise.all([
    repo.findSceneVisitsBySession(db, sessionId),
    repo.findEventsBySession(db, sessionId),
  ]);
  return { session: record, visits, events };
}

export async function getLatestCheckpoint(sessionId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const record = await repo.findSessionById(db, sessionId);
  if (!record) {
    throw new NotFoundError("StorySession", sessionId);
  }
  return repo.findLatestCheckpoint(db, sessionId);
}

export async function createManualCheckpoint(
  sessionId: string,
  sceneId: string,
) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const record = await repo.findSessionById(db, sessionId);
  if (!record) {
    throw new NotFoundError("StorySession", sessionId);
  }
  const latest = await repo.findLatestCheckpoint(db, sessionId);
  const sequenceNumber = latest ? latest.sequenceNumber + 1 : 1;
  const contentHash = await buildSessionStateHash(sessionId, {
    sceneId,
    status: record.sessionStatus,
    version: record.version,
    snapshot: record.contextSnapshot,
  });
  const checkpoint = await repo.createCheckpoint(db, {
    id: crypto.randomUUID(),
    storySessionId: sessionId,
    sceneId,
    checkpointType: "manual",
    schemaVersion: 1,
    sessionState: record.contextSnapshot,
    contentHash,
    sequenceNumber,
  });
  return checkpoint;
}

export async function getSessionById(sessionId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const record = await repo.findSessionById(db, sessionId);
  if (!record) {
    throw new NotFoundError("StorySession", sessionId);
  }
  return record;
}

export async function getActiveSessionForChildAndWorld(
  childProfileId: string,
  worldId: string,
) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  return repo.findActiveSessionByChildAndWorld(db, childProfileId, worldId);
}

export async function listSessionsForChildProfile(
  householdId: string,
  childProfileId: string,
) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const sessions = await repo.findSessionsByChildProfile(
    db,
    householdId,
    childProfileId,
  );

  return Promise.all(
    sessions.map(async (session) => {
      const [currentScene, definition, version, latestCheckpoint] =
        await Promise.all([
          session.currentSceneId
            ? repo.findSceneById(db, session.currentSceneId)
            : Promise.resolve(undefined),
          repo.findDefinitionById(db, session.storyDefinitionId),
          repo.findVersionById(db, session.storyVersionId),
          repo.findLatestCheckpoint(db, session.id),
        ]);

      return {
        session,
        currentScene: currentScene ?? null,
        definition: definition ?? null,
        version: version ?? null,
        latestCheckpoint: latestCheckpoint ?? null,
      };
    }),
  );
}
