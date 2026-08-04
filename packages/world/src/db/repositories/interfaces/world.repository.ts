import type {
  WorldRecord,
  NewWorldRecord,
  WorldRegionRecord,
  NewWorldRegionRecord,
  WorldLocationRecord,
  NewWorldLocationRecord,
  WorldHomeRecord,
  NewWorldHomeRecord,
  WorldBootstrapManifestRecord,
  NewWorldBootstrapManifestRecord,
  WorldCheckpointRecord,
  NewWorldCheckpointRecord,
  WorldCharacterLocationRecord,
  NewWorldCharacterLocationRecord,
  WorldCharacterMovementEventRecord,
  NewWorldCharacterMovementEventRecord,
  WorldLocationConnectionRecord,
  NewWorldLocationConnectionRecord,
  WorldEnvironmentSnapshotRecord,
  NewWorldEnvironmentSnapshotRecord,
  WorldCharacterResidenceRecord,
  NewWorldCharacterResidenceRecord,
  WorldEventStoreRecord,
  NewWorldEventStoreRecord,
} from "../../schema/world";

export interface WorldRepository {
  createWorld(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldRecord,
  ): Promise<WorldRecord>;
  findWorldById(
    tx: { select: QueryExecutor["select"] },
    id: string,
  ): Promise<WorldRecord | undefined>;
  findWorldByCharacterId(
    tx: { select: QueryExecutor["select"] },
    characterId: string,
  ): Promise<WorldRecord | undefined>;
  updateWorld(
    tx: { update: QueryExecutor["update"] },
    id: string,
    data: Partial<NewWorldRecord>,
  ): Promise<WorldRecord | undefined>;

  createRegion(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldRegionRecord,
  ): Promise<WorldRegionRecord>;
  findRegionById(
    tx: { select: QueryExecutor["select"] },
    id: string,
  ): Promise<WorldRegionRecord | undefined>;
  findRegionsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ): Promise<WorldRegionRecord[]>;

  createLocation(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldLocationRecord,
  ): Promise<WorldLocationRecord>;
  updateLocation(
    tx: { update: QueryExecutor["update"] },
    id: string,
    data: Partial<NewWorldLocationRecord>,
  ): Promise<WorldLocationRecord | undefined>;
  findLocationById(
    tx: { select: QueryExecutor["select"] },
    id: string,
  ): Promise<WorldLocationRecord | undefined>;
  findLocationsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ): Promise<WorldLocationRecord[]>;
  findLocationsByRegionId(
    tx: { select: QueryExecutor["select"] },
    regionId: string,
  ): Promise<WorldLocationRecord[]>;

  createHome(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldHomeRecord,
  ): Promise<WorldHomeRecord>;
  findHomeById(
    tx: { select: QueryExecutor["select"] },
    id: string,
  ): Promise<WorldHomeRecord | undefined>;
  findHomeByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ): Promise<WorldHomeRecord | undefined>;

  createBootstrapManifest(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldBootstrapManifestRecord,
  ): Promise<WorldBootstrapManifestRecord>;
  findBootstrapManifestByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ): Promise<WorldBootstrapManifestRecord | undefined>;

  createCheckpoint(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldCheckpointRecord,
  ): Promise<WorldCheckpointRecord>;
  findCheckpointsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ): Promise<WorldCheckpointRecord[]>;
  findLatestCheckpoint(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ): Promise<WorldCheckpointRecord | undefined>;

  upsertCharacterLocation(
    tx: {
      select: QueryExecutor["select"];
      insert: QueryExecutor["insert"];
      update: QueryExecutor["update"];
    },
    data: NewWorldCharacterLocationRecord,
  ): Promise<WorldCharacterLocationRecord>;
  findCharacterLocation(
    tx: { select: QueryExecutor["select"] },
    characterId: string,
  ): Promise<WorldCharacterLocationRecord | undefined>;

  createMovementEvent(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldCharacterMovementEventRecord,
  ): Promise<WorldCharacterMovementEventRecord>;
  findMovementEventsByCharacterId(
    tx: { select: QueryExecutor["select"] },
    characterId: string,
  ): Promise<WorldCharacterMovementEventRecord[]>;

  recordEvent(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldEventStoreRecord,
  ): Promise<WorldEventStoreRecord>;
  findEventsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ): Promise<WorldEventStoreRecord[]>;

  createLocationConnection(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldLocationConnectionRecord,
  ): Promise<WorldLocationConnectionRecord>;
  findConnectionsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ): Promise<WorldLocationConnectionRecord[]>;
  findConnectionBetweenLocations(
    tx: { select: QueryExecutor["select"] },
    fromLocationId: string,
    toLocationId: string,
  ): Promise<WorldLocationConnectionRecord | undefined>;

  createEnvironmentSnapshot(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldEnvironmentSnapshotRecord,
  ): Promise<WorldEnvironmentSnapshotRecord>;
  findEnvironmentSnapshotsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ): Promise<WorldEnvironmentSnapshotRecord[]>;

  createCharacterResidence(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldCharacterResidenceRecord,
  ): Promise<WorldCharacterResidenceRecord>;
  findResidencesByCharacterId(
    tx: { select: QueryExecutor["select"] },
    characterId: string,
  ): Promise<WorldCharacterResidenceRecord[]>;
}

import type { QueryExecutor } from "../../client";
