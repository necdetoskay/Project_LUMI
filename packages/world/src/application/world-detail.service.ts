import { getWorldDb } from "./db";
import { DrizzleWorldRepository } from "../db/repositories/drizzle/drizzle-world.repository";
import { NotFoundError } from "../domain/errors";
import type { Database } from "../db/client";

let testDb: Database | undefined;

export function __setTestDetailDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getWorldDb();
}

export async function getWorldDetail(worldId: string) {
  const db = getDb();
  const repo = new DrizzleWorldRepository();

  const worldRecord = await repo.findWorldById(db, worldId);
  if (!worldRecord) throw new NotFoundError("World", worldId);

  const [regions, locations, home, checkpoints, manifest, connections, envSnapshots] = await Promise.all([
    repo.findRegionsByWorldId(db, worldId),
    repo.findLocationsByWorldId(db, worldId),
    repo.findHomeByWorldId(db, worldId),
    repo.findCheckpointsByWorldId(db, worldId),
    repo.findBootstrapManifestByWorldId(db, worldId),
    repo.findConnectionsByWorldId(db, worldId),
    repo.findEnvironmentSnapshotsByWorldId(db, worldId),
  ]);

  return {
    world: worldRecord,
    regions,
    locations,
    home: home ?? null,
    checkpoints,
    manifest: manifest ?? null,
    connections,
    environmentSnapshots: envSnapshots,
    latestCheckpoint: checkpoints[0] ?? null,
  };
}
