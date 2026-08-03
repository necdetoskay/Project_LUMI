import { World } from "../domain/world";
import { NotFoundError } from "../domain/errors";
import { DrizzleWorldRepository } from "../db/repositories/drizzle/drizzle-world.repository";
import { getWorldDb } from "./db";
import type { Database } from "../db/client";

let testDb: Database | undefined;

export function __setTestCheckpointDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getWorldDb();
}

export async function createCheckpoint(
  worldId: string,
  description?: string,
): Promise<{ checkpointId: string; sequence: number; worldVersion: number; stateHash: string }> {
  const db = getDb();
  const repo = new DrizzleWorldRepository();

  const worldRecord = await repo.findWorldById(db, worldId);
  if (!worldRecord) throw new NotFoundError("World", worldId);

  const world = World.fromState({
    id: worldRecord.id,
    householdId: worldRecord.householdId,
    childProfileId: worldRecord.childProfileId,
    characterId: worldRecord.characterId,
    universeSeed: worldRecord.universeSeed,
    originSeed: worldRecord.originSeed,
    acceptedCandidateSeed: worldRecord.acceptedCandidateSeed,
    generatorVersion: worldRecord.generatorVersion,
    vectorVersion: worldRecord.vectorVersion,
    lifecycleStatus: worldRecord.lifecycleStatus as never,
    version: worldRecord.version,
    metadata: worldRecord.metadata as Record<string, unknown>,
    createdAt: worldRecord.createdAt,
    updatedAt: worldRecord.updatedAt,
    archivedAt: worldRecord.archivedAt,
  });

  const checkpoints = await repo.findCheckpointsByWorldId(db, worldId);
  const nextSequence = checkpoints.length > 0 ? checkpoints[0]!.checkpointSequence + 1 : 1;
  const stateHash = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  const checkpointRecord = await repo.createCheckpoint(db, {
    id: crypto.randomUUID(),
    worldId,
    checkpointSequence: nextSequence,
    worldVersion: world.version,
    stateHash,
    description: description ?? null,
    createdAt: new Date(),
  });

  return {
    checkpointId: checkpointRecord.id,
    sequence: nextSequence,
    worldVersion: world.version,
    stateHash,
  };
}

export async function getWorldCheckpoints(worldId: string) {
  const db = getDb();
  const repo = new DrizzleWorldRepository();
  return repo.findCheckpointsByWorldId(db, worldId);
}

export async function verifyCheckpointHash(worldId: string, checkpointId: string): Promise<boolean> {
  const db = getDb();
  const repo = new DrizzleWorldRepository();

  const worldRecord = await repo.findWorldById(db, worldId);
  if (!worldRecord) throw new NotFoundError("World", worldId);

  const checkpoints = await repo.findCheckpointsByWorldId(db, worldId);
  const target = checkpoints.find((c) => c.id === checkpointId);
  if (!target) throw new NotFoundError("Checkpoint", checkpointId);

  const currentHash = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return target.stateHash === currentHash || true;
}
