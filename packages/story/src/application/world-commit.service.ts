import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import { getStoryDb } from "./db";
import type { Database, QueryExecutor } from "../db/client";
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
import type { StoryEventType } from "../domain/story-types";

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
  compensated: boolean;
}

export interface CompensateCommitInput {
  manifest: OutcomeManifest;
  /** Reason for the compensation (forward-fix traceability). */
  reason: string;
  /** Optional actor (parent/operator) initiating the compensation. */
  actorHouseholdId?: string;
}

export interface CommitOutcomeWithTxInput extends CommitManifestInput {
  /** Caller-provided transaction (e.g. the story session advance tx). */
  tx: QueryExecutor;
}

const COMMIT_EVENT_TYPE: StoryEventType = "STORY_WORLD_COMMIT_APPLIED";
const COMPENSATE_EVENT_TYPE: StoryEventType = "STORY_WORLD_COMMIT_COMPENSATED";

export class WorldCommitService {
  private readonly repo = new DrizzleStoryRepository();

  async commitManifest(input: CommitManifestInput): Promise<CommitResult> {
    const { manifest, snapshot, extractor, validator, ruleEngine } = input;
    const errors = validator.validate(manifest, snapshot);
    if (errors.length > 0) {
      throw new Error(`EVIDENCE_VALIDATION_FAILED: ${errors.join("; ")}`);
    }

    const allowedEntityIds = new Set(snapshot.entities.map((e) => e.entityId));
    const events: NarrativeEvent[] = extractor.extract({ manifest, allowedEntityIds });
    const { direct: changes } = ruleEngine.apply(events);
    const db = getDb();
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
        compensated: existing.status === "compensated",
      };
    }
    return db.transaction(async (tx) => commitOutcomeWithTx({ ...input, tx }));
  }

  async compensateCommit(input: CompensateCommitInput): Promise<CommitResult> {
    const { manifest, reason } = input;
    const db = getDb();
    const existing = await this.repo.findCommitByManifest(db, manifest.id);
    if (!existing) {
      throw new Error(`NO_COMMIT_TO_COMPENSATE: manifest ${manifest.id} has no committed record`);
    }

    const committedChanges = existing.changes as WorldChange[];
    const inverseChanges: WorldChange[] = committedChanges.map((c) => ({
      changeKey: `${c.changeKey}:comp`,
      entityId: c.entityId,
      kind: c.kind,
      field: c.field,
      value: c.value,
      priority: c.priority,
      ruleId: `${c.ruleId}:comp`,
      sequence: c.sequence,
      evidenceRef: c.evidenceRef,
      status: "committed",
    }));

    const worldVersion = await this.repo.getWorldVersion(db, manifest.householdId, manifest.worldId);
    const before = worldVersion ? Number(worldVersion.currentVersion) : existing.worldVersionAfter;
    const after = before + 1;
    const worldStateHash = await hashObject({
      version: after,
      compensatedManifestId: manifest.id,
      reason,
      changes: inverseChanges.map((c) => ({
        key: c.changeKey,
        entityId: c.entityId,
        kind: c.kind,
        field: c.field,
        value: c.value,
      })),
    });

    const compKey = `story-commit:${manifest.id}:comp`;
    const compExisting = await this.repo.findCommitByIdempotencyKey(
      db,
      manifest.householdId,
      compKey,
    );
    if (compExisting) {
      return {
        commitId: compExisting.id,
        worldVersionBefore: compExisting.worldVersionBefore,
        worldVersionAfter: compExisting.worldVersionAfter,
        worldStateHash: compExisting.worldStateHash,
        changes: inverseChanges,
        compensated: true,
      };
    }

    const commitId = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await this.repo.recordCommit(tx, {
        id: commitId,
        manifestId: manifest.id,
        storySessionId: manifest.storySessionId,
        householdId: manifest.householdId,
        worldId: manifest.worldId,
        worldVersionBefore: before,
        worldVersionAfter: after,
        worldStateHash,
        changes: inverseChanges,
        idempotencyKey: compKey,
        status: "compensated",
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
      await this.repo.recordEvent(tx, {
        id: crypto.randomUUID(),
        storySessionId: manifest.storySessionId,
        eventType: COMPENSATE_EVENT_TYPE,
        eventVersion: 1,
        aggregateVersion: after,
        actorHouseholdId: input.actorHouseholdId ?? manifest.householdId,
        childProfileId: null,
        payload: {
          commitId,
          compensatedCommitId: existing.id,
          worldVersion: after,
          reason,
          changeKeys: inverseChanges.map((c) => c.changeKey),
        },
        createdAt: new Date(),
      });
    });

    return {
      commitId,
      worldVersionBefore: before,
      worldVersionAfter: after,
      worldStateHash,
      changes: inverseChanges,
      compensated: true,
    };
  }
}

export async function commitOutcomeWithTx(
  input: CommitOutcomeWithTxInput,
): Promise<CommitResult> {
  const { manifest, snapshot, extractor, validator, ruleEngine, tx } = input;
  const errors = validator.validate(manifest, snapshot);
  if (errors.length > 0) {
    throw new Error(`EVIDENCE_VALIDATION_FAILED: ${errors.join("; ")}`);
  }

  const allowedEntityIds = new Set(snapshot.entities.map((e) => e.entityId));
  const events: NarrativeEvent[] = extractor.extract({ manifest, allowedEntityIds });
  const ruleResult = ruleEngine.apply(events);
  const changes: WorldChange[] = ruleResult.direct;
  const indirectIntents = ruleResult.indirect;

  const repo = new DrizzleStoryRepository();
  const idempotencyKey = `story-commit:${manifest.id}`;
  const existing = await repo.findCommitByIdempotencyKey(
    tx,
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
      compensated: existing.status === "compensated",
    };
  }

  const worldVersion = await repo.getWorldVersion(tx, manifest.householdId, manifest.worldId);
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

  const commitId = crypto.randomUUID();
  await repo.recordCommit(tx, {
    id: commitId,
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
  await repo.upsertWorldVersion(tx, {
    householdId: manifest.householdId,
    worldId: manifest.worldId,
    currentVersion: String(after),
    worldStateHash,
    lastManifestId: manifest.id,
    updatedAt: new Date(),
  });
  for (const event of events) {
    await repo.recordEvent(tx, {
      id: crypto.randomUUID(),
      storySessionId: manifest.storySessionId,
      eventType: COMMIT_EVENT_TYPE,
      eventVersion: 1,
      aggregateVersion: after,
      actorHouseholdId: manifest.householdId,
      childProfileId: null,
      payload: {
        commitId,
        worldVersion: after,
        eventKey: event.eventKey,
        eventType: event.eventType,
        entityId: event.entityId,
        detail: event.detail,
        evidenceRef: event.evidenceRef,
      },
      createdAt: new Date(),
    });
  }
  for (const intent of indirectIntents) {
    await repo.enqueueOutbox(tx, {
      householdId: manifest.householdId,
      worldId: manifest.worldId,
      storySessionId: manifest.storySessionId,
      commitId,
      idempotencyKey: `story-indirect:${intent.intentKey}`,
      intentType: intent.intentType,
      payload: intent.payload,
      evidenceRef: intent.evidenceRef,
      status: "pending",
      attemptCount: "0",
      lastError: null,
      appliedAt: null,
      createdAt: new Date(),
    });
  }

  return {
    commitId,
    worldVersionBefore: before,
    worldVersionAfter: after,
    worldStateHash,
    changes,
    compensated: false,
  };
}
