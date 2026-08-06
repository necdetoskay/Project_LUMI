import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import { getStoryDb } from "./db";
import type { Database } from "../db/client";
import type {
  WorldChange,
  WorldCommitRuleEngine,
} from "../domain/outcome/world-commit-rule-engine";
import type { OutcomeManifest } from "../domain/outcome/outcome-manifest";
import type {
  NarrativeEvent,
  NarrativeEventExtractor,
} from "../domain/outcome/narrative-event-extractor";
import type { EvidenceValidator } from "../domain/outcome/evidence-validator";
import type { StoryContextSnapshot } from "../domain/outcome/story-context-snapshot";
import { hashObject } from "./hash";

let testDb: Database | undefined;

export function __setTestCommitDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

export interface CommitManifestInput {
  manifest: OutcomeManifest;
  snapshot: StoryContextSnapshot;
  extractor: NarrativeEventExtractor;
  validator: EvidenceValidator;
  ruleEngine: WorldCommitRuleEngine;
}

export interface CommitResult {
  commitId: string;
  worldVersionBefore: number;
  worldVersionAfter: number;
  worldStateHash: string;
  changes: WorldChange[];
}

export class WorldCommitService {
  private readonly repo = new DrizzleStoryRepository();

  /**
   * Transactionally applies a validated outcome manifest to the world:
   * idempotency guard → extract → validate → rule-engine → single-tx commit
   * (commit record + world version bump). On evidence failure nothing is written.
   */
  async commitManifest(input: CommitManifestInput): Promise<CommitResult> {
    const { manifest, snapshot, extractor, validator, ruleEngine } = input;

    // Evidence validation is a hard gate before any DB write.
    const errors = validator.validate(manifest, snapshot);
    if (errors.length > 0) {
      throw new Error(`EVIDENCE_VALIDATION_FAILED: ${errors.join("; ")}`);
    }

    const allowedEntityIds = new Set(snapshot.entities.map((e) => e.entityId));
    const events: NarrativeEvent[] = extractor.extract({
      manifest,
      allowedEntityIds,
    });
    const changes: WorldChange[] = ruleEngine.apply(events);

    const db = getDb();
    // Idempotency key derived from manifest (retries must not double-apply).
    const idempotencyKey = `story-commit:${manifest.id}`;

    const existing = await this.repo.findCommitByIdempotencyKey(
      db,
      manifest.householdId,
      idempotencyKey,
    );
    if (existing) {
      return {
        commitId: existing.id,
        worldVersionBefore: existing.worldVersionBefore,
        worldVersionAfter: existing.worldVersionAfter,
        worldStateHash: existing.worldStateHash,
        changes,
      };
    }

    const worldVersion = await this.repo.getWorldVersion(
      db,
      manifest.householdId,
      manifest.worldId,
    );
    const before = worldVersion ? Number(worldVersion.currentVersion) : 1;
    const after = before + 1;
    const worldStateHash = await hashObject({
      version: after,
      manifestId: manifest.id,
      changes: changes.map((c) => ({
        key: c.changeKey,
        entityId: c.entityId,
        kind: c.kind,
        field: c.field,
        value: c.value,
      })),
    });

    // Single transaction: commit record + world version bump.
    await db.transaction(async (tx) => {
      await this.repo.recordCommit(tx, {
        manifestId: manifest.id,
        storySessionId: manifest.storySessionId,
        householdId: manifest.householdId,
        worldId: manifest.worldId,
        worldVersionBefore: before,
        worldVersionAfter: after,
        worldStateHash,
        changes,
        idempotencyKey,
        status: "committed",
        createdAt: new Date(),
      });
      await this.repo.upsertWorldVersion(tx, {
        householdId: manifest.householdId,
        worldId: manifest.worldId,
        currentVersion: String(after),
        worldStateHash,
        lastManifestId: manifest.id,
        updatedAt: new Date(),
      });
    });

    return {
      commitId: crypto.randomUUID(),
      worldVersionBefore: before,
      worldVersionAfter: after,
      worldStateHash,
      changes,
    };
  }
}
