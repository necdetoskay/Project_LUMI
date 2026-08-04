import { DrizzleStoryRepository } from "../../db/repositories/drizzle/drizzle-story.repository";
import { ValidationError, NotFoundError } from "../../domain/errors";
import { getStoryDb } from "../db";
import { recordStoryEventWithTx } from "../story-event-store.service";
import { hashObject } from "../hash";
import { evaluateOptionAvailability } from "./rule-evaluator";
import type { Database } from "../../db/client";
import type {
  ChoiceAvailabilityRule,
  ChoiceRuleContext,
  CreateChoicePointInput,
  CreateChoiceOptionInput,
  CreateOutcomeCandidateInput,
  CommittedChoiceState,
} from "../../domain/choice";
import {
  ChoicePoint,
  ChoiceOption,
  CommittedChoice,
  ChoiceConsequence,
  OutcomeCandidate,
  assertSingleCommit,
  assertKnownConsequenceType,
} from "../../domain/choice";

let testDb: Database | undefined;

export function __setTestChoiceDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

export interface CreateChoicePointServiceInput extends CreateChoicePointInput {
  options: CreateChoiceOptionServiceInput[];
}

export type CreateChoiceOptionServiceInput = Omit<
  CreateChoiceOptionInput,
  "choicePointId"
> & {
  choicePointId?: string | undefined;
};

export async function createChoicePoint(input: CreateChoicePointServiceInput) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();

  const point = ChoicePoint.create(input);
  const pointState = point.getState();
  const options = input.options.map((o) =>
    ChoiceOption.create({ ...o, choicePointId: point.id }),
  );

  return db.transaction(async (tx) => {
    const pointRecord = await repo.createChoicePoint(tx, pointState);
    const optionRecords = await Promise.all(
      options.map((o) => repo.createChoiceOption(tx, o.getState())),
    );
    return { point: pointRecord, options: optionRecords };
  });
}

export async function getChoicePointWithOptions(choicePointId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const point = await repo.findChoicePointById(db, choicePointId);
  if (!point) {
    throw new NotFoundError("ChoicePoint", choicePointId);
  }
  const options = await repo.findChoiceOptionsByPoint(db, choicePointId);
  return { point, options };
}

export async function listChoicePointsByScene(sceneId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  return repo.findChoicePointsByScene(db, sceneId);
}

export async function listChoicePointsByVersion(storyVersionId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  return repo.findChoicePointsByVersion(db, storyVersionId);
}

function buildRuleContext(
  sessionId: string,
  activeSceneId: string,
  storyVersionId: string,
  checkpointHash: string,
  committedChoices: CommittedChoiceState[],
): ChoiceRuleContext {
  return {
    sessionStatus: "active",
    activeSceneId,
    storyVersionId,
    participantFlags: {},
    sessionScores: {},
    choiceHistory: committedChoices.map((c) => ({
      choicePointId: c.choicePointId,
      optionId: c.optionId,
      committedAt: c.committedAt,
    })),
    checkpointHash,
  };
}

export async function evaluateChoicePointAvailability(
  sessionId: string,
  choicePointId: string,
  activeSceneId: string,
  storyVersionId: string,
  checkpointHash: string,
): Promise<{
  point: unknown;
  options: Array<{
    option: unknown;
    available: boolean;
    reason?: string | undefined;
  }>;
}> {
  const db = getDb();
  const repo = new DrizzleStoryRepository();

  const point = await repo.findChoicePointById(db, choicePointId);
  if (!point) {
    throw new NotFoundError("ChoicePoint", choicePointId);
  }

  const options = await repo.findChoiceOptionsByPoint(db, choicePointId);
  const committedChoices = await repo.findCommittedChoicesBySession(
    db,
    sessionId,
  );
  const context = buildRuleContext(
    sessionId,
    activeSceneId,
    storyVersionId,
    checkpointHash,
    committedChoices,
  );

  const evaluatedOptions = options.map((option) => {
    const rule = option.availabilityRule as ChoiceAvailabilityRule | null;
    const result = evaluateOptionAvailability(rule, context);
    return { option, available: result.available, reason: result.reason };
  });

  return { point, options: evaluatedOptions };
}

export interface CommitChoiceInput {
  storySessionId: string;
  choicePointId: string;
  optionId: string;
  evidenceSceneId: string;
  idempotencyKey?: string | undefined;
  actorUserId?: string | undefined;
}

export async function commitChoice(input: CommitChoiceInput) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();

  const point = await repo.findChoicePointById(db, input.choicePointId);
  if (!point) {
    throw new NotFoundError("ChoicePoint", input.choicePointId);
  }
  const option = await repo.findChoiceOptionById(db, input.optionId);
  if (!option || option.choicePointId !== input.choicePointId) {
    throw new NotFoundError("ChoiceOption", input.optionId);
  }

  const existing = await repo.findCommittedChoiceByPoint(
    db,
    input.storySessionId,
    input.choicePointId,
  );
  if (existing) {
    assertSingleCommit(existing, input.optionId);
    return existing;
  }

  const session = await repo.findSessionById(db, input.storySessionId);
  if (!session) {
    throw new NotFoundError("StorySession", input.storySessionId);
  }
  if (
    session.sessionStatus !== "active" &&
    session.sessionStatus !== "paused"
  ) {
    throw new ValidationError(
      "SESSION_NOT_ACTIVE",
      "Choices can only be committed in active or paused sessions",
    );
  }

  const committedChoices = await repo.findCommittedChoicesBySession(
    db,
    input.storySessionId,
  );
  const context = buildRuleContext(
    input.storySessionId,
    session.currentSceneId ?? input.evidenceSceneId,
    session.storyVersionId,
    await hashSessionContext(session),
    committedChoices,
  );
  const optionAvailability =
    option.availabilityRule as ChoiceAvailabilityRule | null;
  const availability = evaluateOptionAvailability(optionAvailability, context);
  if (!availability.available) {
    throw new ValidationError(
      "OPTION_NOT_AVAILABLE",
      availability.reason ?? "This option is not available",
    );
  }

  const committed = CommittedChoice.create({
    storySessionId: input.storySessionId,
    choicePointId: input.choicePointId,
    optionId: input.optionId,
    evidenceSceneId: input.evidenceSceneId,
    ruleVersion: point.ruleVersion,
    actorUserId: input.actorUserId,
  });

  const consequenceType = "scene_transition";
  assertKnownConsequenceType(consequenceType);
  const consequence = ChoiceConsequence.create({
    storySessionId: input.storySessionId,
    committedChoiceId: committed.id,
    consequenceType,
    targetKey: undefined,
    payload: {
      choicePointId: input.choicePointId,
      optionId: input.optionId,
      evidenceSceneId: input.evidenceSceneId,
    },
  });

  return db.transaction(async (tx) => {
    const record = await repo.createCommittedChoice(tx, committed.getState());
    const consequenceRecord = await repo.createChoiceConsequence(
      tx,
      consequence.getState(),
    );

    await recordStoryEventWithTx(tx, {
      storySessionId: input.storySessionId,
      childProfileId: session.childProfileId,
      eventType: "STORY_CHOICE_COMMITTED",
      aggregateVersion: session.version,
      actorHouseholdId: session.householdId,
      payload: {
        choicePointId: input.choicePointId,
        optionId: input.optionId,
        committedChoiceId: record.id,
      },
    });

    if (input.idempotencyKey) {
      await repo.recordIdempotency(tx, {
        id: crypto.randomUUID(),
        householdId: session.householdId,
        operationType: "choice_commit",
        idempotencyKey: input.idempotencyKey,
        storySessionId: input.storySessionId,
      });
    }

    return { committedChoice: record, consequence: consequenceRecord };
  });
}

async function hashSessionContext(session: {
  id: string;
  currentSceneId: string | null;
  sessionStatus: string;
  version: number;
  contextSnapshot: unknown;
}): Promise<string> {
  return hashObject({
    sessionId: session.id,
    sceneId: session.currentSceneId,
    status: session.sessionStatus,
    version: session.version,
    snapshot: session.contextSnapshot,
  });
}

export async function getChoiceHistory(sessionId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const session = await repo.findSessionById(db, sessionId);
  if (!session) {
    throw new NotFoundError("StorySession", sessionId);
  }
  return repo.findCommittedChoicesBySession(db, sessionId);
}

export async function createOutcomeCandidate(
  input: CreateOutcomeCandidateInput,
) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const candidate = OutcomeCandidate.create(input);
  return repo.createOutcomeCandidate(db, candidate.getState());
}

export async function getLatestOutcomeCandidate(sessionId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  return repo.findLatestOutcomeCandidateBySession(db, sessionId);
}

export async function listConsequencesBySession(sessionId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  return repo.findConsequencesBySession(db, sessionId);
}
