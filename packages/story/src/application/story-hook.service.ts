import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import { StoryHook } from "../domain/story-hook";
import type {
  StoryHookState,
  HookType,
  SceneType,
} from "../domain/story-types";
import { assertKnownHookType } from "../domain/story-types";
import { ValidationError } from "../domain/errors";
import { getStoryDb } from "./db";
import type { Database } from "../db/client";

let testDb: Database | undefined;

export function __setTestHookDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

export interface CreateStoryHookInput {
  householdId: string;
  childProfileId: string;
  storySessionId: string;
  worldId: string;
  opportunityId: string;
  opportunityStatus: string;
  opportunityHouseholdId: string;
  sourceNpcId: string;
  targetNpcId?: string | null;
  hookType: HookType;
  sceneType: SceneType;
  payload: Record<string, unknown>;
  constraints: Record<string, unknown>;
}

export interface StoryHookResult {
  hook: StoryHookState;
  created: boolean;
}

export class StoryHookService {
  private repo: DrizzleStoryRepository;

  constructor() {
    this.repo = new DrizzleStoryRepository();
  }

  async createHook(input: CreateStoryHookInput): Promise<StoryHookResult> {
    if (input.opportunityStatus !== "accepted") {
      throw new ValidationError(
        "HOOK_OPPORTUNITY_NOT_ACCEPTED",
        `Cannot create a hook from a ${input.opportunityStatus} opportunity`,
      );
    }

    if (input.opportunityHouseholdId !== input.householdId) {
      throw new ValidationError(
        "HOOK_HOUSEMISMATCH",
        `Opportunity household ${input.opportunityHouseholdId} does not match hook household ${input.householdId}`,
      );
    }

    assertKnownHookType(input.hookType);

    const existing = await this.repo.findHookByOpportunityId(
      getDb(),
      input.opportunityId,
    );

    if (existing) {
      return {
        hook: existing as unknown as StoryHookState,
        created: false,
      };
    }

    const hook = StoryHook.create({
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      storySessionId: input.storySessionId,
      worldId: input.worldId,
      opportunityId: input.opportunityId,
      hookType: input.hookType,
      sourceNpcId: input.sourceNpcId,
      targetNpcId: input.targetNpcId ?? null,
      payload: input.payload,
      constraints: input.constraints,
      sceneType: input.sceneType,
    });

    const state = hook.getState();

    await this.repo.createHook(getDb(), state);

    await recordStoryEvent(
      input.storySessionId,
      input.childProfileId,
      input.householdId,
      "STORY_HOOK_CREATED",
      state.version,
      {
        hookId: state.id,
        opportunityId: state.opportunityId,
        hookType: state.hookType,
        sceneType: state.sceneType,
        sourceNpcId: state.sourceNpcId,
        targetNpcId: state.targetNpcId,
      },
    );

    // S27-T04: enqueue a hook-delivery intent so downstream consumers can
    // pick the hook up through the existing outbox/propagator infrastructure.
    await this.repo.enqueueOutbox(getDb(), {
      id: crypto.randomUUID(),
      householdId: input.householdId,
      worldId: input.worldId,
      commitId: state.id,
      idempotencyKey: `story-hook:${input.opportunityId}`,
      intentType: "story_hook_delivery",
      payload: {
        hookId: state.id,
        opportunityId: state.opportunityId,
        hookType: state.hookType,
        sceneType: state.sceneType,
        sourceNpcId: state.sourceNpcId,
        targetNpcId: state.targetNpcId,
        storySessionId: state.storySessionId,
      },
      evidenceRef: `hook://${state.id}`,
      status: "pending",
      attemptCount: "0",
      lastError: null,
      appliedAt: null,
      createdAt: new Date(),
    });

    // S31-T03: for a quest_seed hook, additionally signal quest automation so
    // the world-side applicator can instantiate + activate a quest from an
    // authored template. The payload is plain JSON; story never imports world.
    if (state.hookType === "quest_seed") {
      const factId =
        typeof input.payload.factId === "string" ? input.payload.factId : "";
      await this.repo.enqueueOutbox(getDb(), {
        id: crypto.randomUUID(),
        householdId: input.householdId,
        worldId: input.worldId,
        commitId: state.id,
        idempotencyKey: `quest-seed:${state.id}`,
        intentType: "quest_seed_automation",
        payload: {
          hookId: state.id,
          opportunityId: state.opportunityId,
          storySessionId: state.storySessionId,
          worldId: state.worldId,
          householdId: state.householdId,
          factId,
          sourceNpcId: state.sourceNpcId,
        },
        evidenceRef: `hook://${state.id}`,
        status: "pending",
        attemptCount: "0",
        lastError: null,
        appliedAt: null,
        createdAt: new Date(),
      });
    }

    return {
      hook: state,
      created: true,
    };
  }
}

async function recordStoryEvent(
  storySessionId: string,
  childProfileId: string,
  actorHouseholdId: string,
  eventType: "STORY_HOOK_CREATED",
  aggregateVersion: number,
  additionalPayload: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  await repo.recordEvent(db, {
    id: crypto.randomUUID(),
    storySessionId,
    eventType,
    eventVersion: 1,
    aggregateVersion,
    actorHouseholdId,
    childProfileId,
    payload: {
      ...additionalPayload,
      eventType,
    },
    createdAt: new Date(),
  });
}
