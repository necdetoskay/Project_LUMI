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
  /** Cap on how many outbox rows to process in one pass. */
  limit?: number;
}

export interface PropagateResult {
  processed: number;
  applied: number;
  failed: number;
  skipped: number;
}

export interface IndirectEffectApplicator {
  /**
   * Applies one indirect-effect intent. Must be idempotent per intentKey.
   * Returns the number of world writes performed (0 = no-op, still applied).
   */
  apply(intent: StoryOutboxRecord): Promise<{ writes: number }>;
}

const APPLIED_EVENT: StoryEventType = "INDIRECT_EFFECT_APPLIED";
const FAILED_EVENT: StoryEventType = "INDIRECT_EFFECT_FAILED";

/**
 * Reads pending/failed outbox intents for a household and applies each one
 * exactly once. Idempotency: an already-`applied` row is never re-applied;
 * a row already marked applied by a prior pass short-circuits. Each row is
 * claimed, applied, marked `applied` (or `failed` on error) in isolation so
 * one failure never blocks the rest.
 */
export class IndirectEffectPropagator {
  private readonly repo = new DrizzleStoryRepository();

  constructor(
    private readonly applicator: IndirectEffectApplicator,
    private readonly maxAttempts = 3,
  ) {}

  async propagate(input: PropagateInput): Promise<PropagateResult> {
    const db = getDb();
    const limit = input.limit ?? 50;
    const pending = await this.repo.claimPendingOutbox(
      db,
      input.householdId,
      limit,
    );

    const result: PropagateResult = {
      processed: 0,
      applied: 0,
      failed: 0,
      skipped: 0,
    };

    for (const row of pending) {
      result.processed += 1;
      const attempt = Number(row.attemptCount ?? "0") + 1;

      // Idempotency guard: never re-apply an already-applied intent.
      if (row.status === "applied") {
        result.skipped += 1;
        continue;
      }

      // Attempt cap: give up after maxAttempts, keep original intact.
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
          await this.repo.recordEvent(tx, {
            id: crypto.randomUUID(),
            storySessionId: row.commitId.toString(),
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
        });
        result.applied += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.repo.markOutbox(db, row.id, {
          status: attempt >= this.maxAttempts ? "failed" : "pending",
          attemptCount: attempt,
          lastError: message,
          appliedAt: null,
        });
        await this.repo.recordEvent(db, {
          id: crypto.randomUUID(),
          storySessionId: row.commitId.toString(),
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
        result.failed += 1;
      }
    }

    return result;
  }
}
