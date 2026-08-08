import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import { getStoryDb } from "./db";
import type { Database } from "../db/client";
import type { StoryOutboxRecord } from "../db/schema/story";
import type { StoryEventType } from "../domain/story-types";

let testDb: Database | undefined;

export function __setTestPropagationDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

export interface PropagateInput {
  householdId: string;
  limit?: number;
}

export interface PropagateResult {
  processed: number;
  applied: number;
  failed: number;
  skipped: number;
}

export interface IndirectEffectApplicator {
  apply(intent: StoryOutboxRecord): Promise<{ writes: number }>;
}

const APPLIED_EVENT: StoryEventType = "INDIRECT_EFFECT_APPLIED";
const FAILED_EVENT: StoryEventType = "INDIRECT_EFFECT_FAILED";
const MAX_ERROR_LENGTH = 400;

function boundedError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.length <= MAX_ERROR_LENGTH ? raw : `${raw.slice(0, MAX_ERROR_LENGTH - 3)}...`;
}

export class IndirectEffectPropagator {
  private readonly repo = new DrizzleStoryRepository();

  constructor(
    private readonly applicator: IndirectEffectApplicator,
    private readonly maxAttempts = 3,
  ) {}

  async propagate(input: PropagateInput): Promise<PropagateResult> {
    const db = getDb();
    const limit = input.limit ?? 50;
    const pending = await this.repo.claimPendingOutbox(db, input.householdId, limit);
    const result: PropagateResult = { processed: 0, applied: 0, failed: 0, skipped: 0 };

    for (const row of pending) {
      result.processed += 1;
      const attempt = Number(row.attemptCount ?? "0") + 1;

      if (row.status === "applied") {
        result.skipped += 1;
        continue;
      }

      if (attempt > this.maxAttempts) {
        result.failed += 1;
        await this.repo.markOutbox(db, row.id, {
          status: "failed",
          attemptCount: attempt,
          lastError: "max attempts exceeded",
          appliedAt: null,
        });
        continue;
      }

      try {
        await this.applicator.apply(row);
        await db.transaction(async (tx) => {
          await this.repo.markOutbox(tx, row.id, {
            status: "applied",
            attemptCount: attempt,
            lastError: null,
            appliedAt: new Date(),
          });
          if (row.storySessionId) {
            await this.repo.recordEvent(tx, {
              id: crypto.randomUUID(),
              storySessionId: row.storySessionId,
              eventType: APPLIED_EVENT,
              eventVersion: 1,
              aggregateVersion: attempt,
              actorHouseholdId: row.householdId,
              childProfileId: null,
              payload: {
                outboxId: row.id,
                commitId: row.commitId,
                intentType: row.intentType,
                idempotencyKey: row.idempotencyKey,
              },
              createdAt: new Date(),
            });
          }
        });
        result.applied += 1;
      } catch (error) {
        const message = boundedError(error);
        await this.repo.markOutbox(db, row.id, {
          status: attempt >= this.maxAttempts ? "failed" : "pending",
          attemptCount: attempt,
          lastError: message,
          appliedAt: null,
        });
        if (row.storySessionId) {
          await this.repo.recordEvent(db, {
            id: crypto.randomUUID(),
            storySessionId: row.storySessionId,
            eventType: FAILED_EVENT,
            eventVersion: 1,
            aggregateVersion: attempt,
            actorHouseholdId: row.householdId,
            childProfileId: null,
            payload: {
              outboxId: row.id,
              intentType: row.intentType,
              error: message,
            },
            createdAt: new Date(),
          });
        }
        result.failed += 1;
      }
    }

    return result;
  }
}
