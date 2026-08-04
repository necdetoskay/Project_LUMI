import { eq, desc, or, and } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import type { WorldRepository } from "../interfaces/world.repository";
import type {
  NewWorldRecord,
  NewWorldRegionRecord,
  NewWorldLocationRecord,
  NewWorldHomeRecord,
  NewWorldBootstrapManifestRecord,
  NewWorldCheckpointRecord,
  NewWorldCharacterLocationRecord,
  NewWorldCharacterMovementEventRecord,
  NewWorldEventStoreRecord,
  NewWorldEnvironmentSnapshotRecord,
  NewWorldLocationConnectionRecord,
  NewWorldCharacterResidenceRecord,
} from "../../schema/world";
import {
  worlds,
  worldRegions,
  worldLocations,
  worldHomes,
  worldBootstrapManifests,
  worldCheckpoints,
  worldCharacterLocations,
  worldCharacterMovementEvents,
  worldEventStore,
  worldEnvironmentSnapshots,
  worldLocationConnections,
  worldCharacterResidences,
} from "../../schema/world";

export class DrizzleWorldRepository implements WorldRepository {
  async createWorld(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldRecord,
  ) {
    const [row] = await tx.insert(worlds).values(data).returning();
    return row!;
  }

  async findWorldById(tx: { select: QueryExecutor["select"] }, id: string) {
    const [row] = await tx
      .select()
      .from(worlds)
      .where(eq(worlds.id, id))
      .limit(1);
    return row;
  }

  async findWorldByCharacterId(
    tx: { select: QueryExecutor["select"] },
    characterId: string,
  ) {
    const [row] = await tx
      .select()
      .from(worlds)
      .where(eq(worlds.characterId, characterId))
      .limit(1);
    return row;
  }

  async updateWorld(
    tx: { update: QueryExecutor["update"] },
    id: string,
    data: Partial<NewWorldRecord>,
  ) {
    const [row] = await tx
      .update(worlds)
      .set(data)
      .where(eq(worlds.id, id))
      .returning();
    return row;
  }

  async createRegion(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldRegionRecord,
  ) {
    const [row] = await tx.insert(worldRegions).values(data).returning();
    return row!;
  }

  async findRegionById(tx: { select: QueryExecutor["select"] }, id: string) {
    const [row] = await tx
      .select()
      .from(worldRegions)
      .where(eq(worldRegions.id, id))
      .limit(1);
    return row;
  }

  async findRegionsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ) {
    return tx
      .select()
      .from(worldRegions)
      .where(eq(worldRegions.worldId, worldId))
      .orderBy(worldRegions.sortOrder);
  }

  async createLocation(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldLocationRecord,
  ) {
    const [row] = await tx.insert(worldLocations).values(data).returning();
    return row!;
  }

  async updateLocation(
    tx: { update: QueryExecutor["update"] },
    id: string,
    data: Partial<NewWorldLocationRecord>,
  ) {
    const [row] = await tx
      .update(worldLocations)
      .set(data)
      .where(eq(worldLocations.id, id))
      .returning();
    return row;
  }

  async findLocationById(tx: { select: QueryExecutor["select"] }, id: string) {
    const [row] = await tx
      .select()
      .from(worldLocations)
      .where(eq(worldLocations.id, id))
      .limit(1);
    return row;
  }

  async findLocationsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ) {
    return tx
      .select()
      .from(worldLocations)
      .where(eq(worldLocations.worldId, worldId));
  }

  async findLocationsByRegionId(
    tx: { select: QueryExecutor["select"] },
    regionId: string,
  ) {
    return tx
      .select()
      .from(worldLocations)
      .where(eq(worldLocations.regionId, regionId));
  }

  async createHome(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldHomeRecord,
  ) {
    const [row] = await tx.insert(worldHomes).values(data).returning();
    return row!;
  }

  async findHomeById(tx: { select: QueryExecutor["select"] }, id: string) {
    const [row] = await tx
      .select()
      .from(worldHomes)
      .where(eq(worldHomes.id, id))
      .limit(1);
    return row;
  }

  async findHomeByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ) {
    const [row] = await tx
      .select()
      .from(worldHomes)
      .where(eq(worldHomes.worldId, worldId))
      .limit(1);
    return row;
  }

  async createBootstrapManifest(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldBootstrapManifestRecord,
  ) {
    const [row] = await tx
      .insert(worldBootstrapManifests)
      .values(data)
      .returning();
    return row!;
  }

  async findBootstrapManifestByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ) {
    const [row] = await tx
      .select()
      .from(worldBootstrapManifests)
      .where(eq(worldBootstrapManifests.worldId, worldId))
      .limit(1);
    return row;
  }

  async createCheckpoint(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldCheckpointRecord,
  ) {
    const [row] = await tx.insert(worldCheckpoints).values(data).returning();
    return row!;
  }

  async findCheckpointsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ) {
    return tx
      .select()
      .from(worldCheckpoints)
      .where(eq(worldCheckpoints.worldId, worldId))
      .orderBy(desc(worldCheckpoints.checkpointSequence));
  }

  async findLatestCheckpoint(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ) {
    const [row] = await tx
      .select()
      .from(worldCheckpoints)
      .where(eq(worldCheckpoints.worldId, worldId))
      .orderBy(desc(worldCheckpoints.checkpointSequence))
      .limit(1);
    return row;
  }

  async upsertCharacterLocation(
    tx: {
      select: QueryExecutor["select"];
      insert: QueryExecutor["insert"];
      update: QueryExecutor["update"];
    },
    data: NewWorldCharacterLocationRecord,
  ) {
    const existing = await this.findCharacterLocation(tx, data.characterId);
    if (existing) {
      const [row] = await tx
        .update(worldCharacterLocations)
        .set({
          locationId: data.locationId,
          enteredAt: data.enteredAt,
          version: existing.version + 1,
        })
        .where(eq(worldCharacterLocations.characterId, data.characterId))
        .returning();
      return row!;
    }
    const [row] = await tx
      .insert(worldCharacterLocations)
      .values(data)
      .returning();
    return row!;
  }

  async findCharacterLocation(
    tx: { select: QueryExecutor["select"] },
    characterId: string,
  ) {
    const [row] = await tx
      .select()
      .from(worldCharacterLocations)
      .where(eq(worldCharacterLocations.characterId, characterId))
      .limit(1);
    return row;
  }

  async createMovementEvent(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldCharacterMovementEventRecord,
  ) {
    const [row] = await tx
      .insert(worldCharacterMovementEvents)
      .values(data)
      .returning();
    return row!;
  }

  async findMovementEventsByCharacterId(
    tx: { select: QueryExecutor["select"] },
    characterId: string,
  ) {
    return tx
      .select()
      .from(worldCharacterMovementEvents)
      .where(eq(worldCharacterMovementEvents.characterId, characterId))
      .orderBy(desc(worldCharacterMovementEvents.createdAt));
  }

  async recordEvent(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldEventStoreRecord,
  ) {
    const [row] = await tx.insert(worldEventStore).values(data).returning();
    return row!;
  }

  async findEventsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ) {
    return tx
      .select()
      .from(worldEventStore)
      .where(eq(worldEventStore.worldId, worldId))
      .orderBy(worldEventStore.createdAt);
  }

  async createEnvironmentSnapshot(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldEnvironmentSnapshotRecord,
  ) {
    const [row] = await tx
      .insert(worldEnvironmentSnapshots)
      .values(data)
      .returning();
    return row!;
  }

  async createLocationConnection(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldLocationConnectionRecord,
  ) {
    const [row] = await tx
      .insert(worldLocationConnections)
      .values(data)
      .returning();
    return row!;
  }

  async createCharacterResidence(
    tx: { insert: QueryExecutor["insert"] },
    data: NewWorldCharacterResidenceRecord,
  ) {
    const [row] = await tx
      .insert(worldCharacterResidences)
      .values(data)
      .returning();
    return row!;
  }

  async findConnectionsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ) {
    return tx
      .select()
      .from(worldLocationConnections)
      .where(eq(worldLocationConnections.worldId, worldId));
  }

  async findConnectionBetweenLocations(
    tx: { select: QueryExecutor["select"] },
    fromLocationId: string,
    toLocationId: string,
  ) {
    const [row] = await tx
      .select()
      .from(worldLocationConnections)
      .where(
        or(
          and(
            eq(worldLocationConnections.fromLocationId, fromLocationId),
            eq(worldLocationConnections.toLocationId, toLocationId),
          ),
          and(
            eq(worldLocationConnections.isBidirectional, true),
            eq(worldLocationConnections.fromLocationId, toLocationId),
            eq(worldLocationConnections.toLocationId, fromLocationId),
          ),
        ),
      )
      .limit(1);
    return row;
  }

  async findResidencesByCharacterId(
    tx: { select: QueryExecutor["select"] },
    characterId: string,
  ) {
    return tx
      .select()
      .from(worldCharacterResidences)
      .where(eq(worldCharacterResidences.characterId, characterId));
  }

  async findEnvironmentSnapshotsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ) {
    return tx
      .select()
      .from(worldEnvironmentSnapshots)
      .where(eq(worldEnvironmentSnapshots.worldId, worldId));
  }
}
