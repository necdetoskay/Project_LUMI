import { eq } from "drizzle-orm";

import { World } from "../domain/world";
import { Region } from "../domain/region";
import { Location } from "../domain/location";
import { Home } from "../domain/home";
import { NotFoundError } from "../domain/errors";
import { DrizzleWorldRepository } from "../db/repositories/drizzle/drizzle-world.repository";
import { worlds } from "../db/schema/world";
import { getWorldDb } from "./db";
import { recordDomainEventWithTx } from "./event-store.service";
import type { Database } from "../db/client";

let testDb: Database | undefined;

export function __setTestWorldDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getWorldDb();
}

export interface OriginPackageInput {
  characterType: string;
  subtype: string;
  originConcept: string;
  startingRegionArchetype: string;
  startingLocation: string;
  homeArchetype: string;
  nearbyNpcSeed: string;
  firstMysterySeed: string;
  toneVector?: Record<string, number>;
  safetyBounds?: Record<string, unknown>;
  noveltyMarkers?: string[];
}

export interface BootstrapWorldInput {
  householdId: string;
  childProfileId: string;
  characterId: string;
  universeSeed: string;
  originSeed: string;
  acceptedCandidateSeed: string;
  generatorVersion: string;
  vectorVersion: string;
  originPackage: OriginPackageInput;
  actorUserId: string;
}

export interface BootstrapWorldResult {
  worldId: string;
  regionId: string;
  locationId: string;
  homeId: string;
  secondLocationId: string;
  connectionId: string;
  residenceId: string;
  environmentSnapshotId: string;
  manifestId: string;
  checkpointId: string;
}

function regionTypeFromArchetype(archetype: string): string {
  const archetypeMap: Record<string, string> = {
    sea: "water",
    ocean: "water",
    reef: "water",
    lagoon: "water",
    river: "water",
    forest: "forest",
    mountain: "mountain",
    cave: "underground",
    volcano: "mountain",
    village: "settlement",
    meadow: "forest",
    garden: "settlement",
    farm: "settlement",
    sky: "sky",
    cloud: "sky",
    cliff: "mountain",
    island: "island",
    beach: "coastal",
    coast: "coastal",
    desert: "wilderness",
    lab: "settlement",
    workshop: "settlement",
    observatory: "settlement",
    city: "urban",
    school: "settlement",
    mountain_path: "mountain",
    magical: "magical",
    crystal: "magical",
    portal: "magical",
  };

  const lower = archetype.toLowerCase();
  for (const [keyword, type] of Object.entries(archetypeMap)) {
    if (lower.includes(keyword)) return type;
  }
  return "custom";
}

function starterLocationTypeForArchetype(archetype: string): string {
  const locationMap: Record<string, string> = {
    sea: "reef",
    ocean: "reef",
    reef: "reef",
    lagoon: "lagoon",
    river: "river_bank",
    cave: "cave",
    volcano: "cave",
    mountain: "lookout",
    forest: "path",
    village: "town_square",
    sky: "cloud_platform",
    cloud: "cloud_platform",
    beach: "beach",
    coast: "beach",
    island: "beach",
    lab: "workshop",
    workshop: "workshop",
    school: "building",
    city: "town_square",
    nest: "nest",
    den: "den",
    meadow: "garden",
    garden: "garden",
    coral: "coral_house",
    portal: "custom",
  };

  const lower = archetype.toLowerCase();
  for (const [keyword, type] of Object.entries(locationMap)) {
    if (lower.includes(keyword)) return type;
  }
  return "custom";
}

function secondLocationKeyForArchetype(archetype: string): {
  key: string;
  name: string;
  locationType: string;
} {
  const secondLocations: Record<
    string,
    { key: string; name: string; locationType: string }
  > = {
    sea: { key: "tide-pools", name: "Tide Pools", locationType: "reef" },
    ocean: { key: "tide-pools", name: "Tide Pools", locationType: "reef" },
    reef: { key: "deep-drop", name: "Deep Drop-off", locationType: "reef" },
    lagoon: {
      key: "seagrass-meadow",
      name: "Seagrass Meadow",
      locationType: "reef",
    },
    river: {
      key: "river-bend",
      name: "River Bend",
      locationType: "river_bank",
    },
    forest: { key: "sunlit-glade", name: "Sunlit Glade", locationType: "path" },
    mountain: {
      key: "ridge-path",
      name: "Ridge Path",
      locationType: "lookout",
    },
    cave: {
      key: "crystal-chamber",
      name: "Crystal Chamber",
      locationType: "cave",
    },
    volcano: { key: "ash-field", name: "Ash Field", locationType: "cave" },
    village: {
      key: "market-square",
      name: "Market Square",
      locationType: "town_square",
    },
    sky: {
      key: "floating-garden",
      name: "Floating Garden",
      locationType: "cloud_platform",
    },
    cloud: {
      key: "breezy-perch",
      name: "Breezy Perch",
      locationType: "cloud_platform",
    },
    beach: { key: "sand-dunes", name: "Sand Dunes", locationType: "beach" },
    coast: { key: "tidal-pool", name: "Tidal Pool", locationType: "beach" },
    island: { key: "inland-trail", name: "Inland Trail", locationType: "path" },
    lab: {
      key: "research-station",
      name: "Research Station",
      locationType: "workshop",
    },
    workshop: {
      key: "storage-room",
      name: "Storage Room",
      locationType: "building",
    },
    school: { key: "playground", name: "Playground", locationType: "garden" },
    city: { key: "quiet-alley", name: "Quiet Alley", locationType: "path" },
    desert: { key: "oasis", name: "Oasis", locationType: "custom" },
  };

  const lower = archetype.toLowerCase();
  for (const [keyword, loc] of Object.entries(secondLocations)) {
    if (lower.includes(keyword)) return loc;
  }
  return { key: "nearby-spot", name: "Nearby Spot", locationType: "custom" };
}

export async function createWorldFromOrigin(
  input: BootstrapWorldInput,
): Promise<BootstrapWorldResult> {
  const db = getDb();
  const repo = new DrizzleWorldRepository();

  const world = World.create({
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    characterId: input.characterId,
    universeSeed: input.universeSeed,
    originSeed: input.originSeed,
    acceptedCandidateSeed: input.acceptedCandidateSeed,
    generatorVersion: input.generatorVersion,
    vectorVersion: input.vectorVersion,
    originConcept: input.originPackage.originConcept,
  });

  const regionType = regionTypeFromArchetype(
    input.originPackage.startingRegionArchetype,
  );
  const locationType = starterLocationTypeForArchetype(
    input.originPackage.startingLocation,
  );
  const secondLoc = secondLocationKeyForArchetype(
    input.originPackage.startingRegionArchetype,
  );

  const result = await db.transaction(async (tx) => {
    const worldRecord = await repo.createWorld(tx, {
      id: world.getState().id,
      householdId: world.householdId,
      childProfileId: input.childProfileId,
      characterId: world.characterId,
      universeSeed: world.getState().universeSeed,
      originSeed: world.getState().originSeed,
      acceptedCandidateSeed: world.getState().acceptedCandidateSeed,
      generatorVersion: world.getState().generatorVersion,
      vectorVersion: world.getState().vectorVersion,
      lifecycleStatus: world.getState().lifecycleStatus,
      metadata: world.getState().metadata,
      version: world.getState().version,
      createdAt: world.getState().createdAt,
      updatedAt: world.getState().updatedAt,
      archivedAt: null,
    });

    const region = Region.create({
      worldId: worldRecord.id,
      regionKey: `starting-${input.originPackage.startingRegionArchetype.toLowerCase().replace(/\s+/g, "-")}`,
      displayName: input.originPackage.startingRegionArchetype,
      regionType: regionType as never,
      accessibilityStatus: "open",
      discoveryStatus: "discovered",
      sortOrder: 0,
    });

    const regionRecord = await repo.createRegion(tx, {
      id: region.getState().id,
      worldId: region.getState().worldId,
      regionKey: region.getState().regionKey,
      displayName: region.getState().displayName,
      regionType: region.getState().regionType,
      accessibilityStatus: region.getState().accessibilityStatus,
      discoveryStatus: region.getState().discoveryStatus,
      environmentVector: region.getState().environmentVector,
      subregionOf: region.getState().subregionOf,
      sortOrder: region.getState().sortOrder,
      version: region.getState().version,
      createdAt: region.getState().createdAt,
      updatedAt: region.getState().updatedAt,
    });

    const location = Location.create({
      worldId: worldRecord.id,
      regionId: regionRecord.id,
      locationKey: input.originPackage.startingLocation
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9_-]/g, ""),
      displayName: input.originPackage.startingLocation,
      accessibilityStatus: "open",
      locationType: locationType,
      occupancyLevel: "sparse",
      safetyLevel: "safe",
      isHome: true,
    });

    const locationRecord = await repo.createLocation(tx, {
      id: location.getState().id,
      worldId: location.getState().worldId,
      regionId: location.getState().regionId,
      locationKey: location.getState().locationKey,
      displayName: location.getState().displayName,
      accessibilityStatus: location.getState().accessibilityStatus,
      locationType: location.getState().locationType,
      occupancyLevel: location.getState().occupancyLevel,
      safetyLevel: location.getState().safetyLevel,
      isHome: location.getState().isHome,
      metadata: location.getState().metadata,
      version: location.getState().version,
      createdAt: location.getState().createdAt,
      updatedAt: location.getState().updatedAt,
    });

    const secondLocation = Location.create({
      worldId: worldRecord.id,
      regionId: regionRecord.id,
      locationKey: secondLoc.key,
      displayName: secondLoc.name,
      accessibilityStatus: "open",
      locationType: secondLoc.locationType,
      occupancyLevel: "empty",
      safetyLevel: "safe",
      isHome: false,
    });

    const secondLocationRecord = await repo.createLocation(tx, {
      id: secondLocation.getState().id,
      worldId: secondLocation.getState().worldId,
      regionId: secondLocation.getState().regionId,
      locationKey: secondLocation.getState().locationKey,
      displayName: secondLocation.getState().displayName,
      accessibilityStatus: secondLocation.getState().accessibilityStatus,
      locationType: secondLocation.getState().locationType,
      occupancyLevel: secondLocation.getState().occupancyLevel,
      safetyLevel: secondLocation.getState().safetyLevel,
      isHome: secondLocation.getState().isHome,
      metadata: secondLocation.getState().metadata,
      version: secondLocation.getState().version,
      createdAt: secondLocation.getState().createdAt,
      updatedAt: secondLocation.getState().updatedAt,
    });

    const home = Home.create({
      worldId: worldRecord.id,
      locationId: locationRecord.id,
      homeType: "permanent",
      displayName: input.originPackage.homeArchetype,
      residenceType: "primary",
    });

    const homeRecord = await repo.createHome(tx, {
      id: home.getState().id,
      worldId: home.getState().worldId,
      locationId: home.getState().locationId,
      homeType: home.getState().homeType,
      displayName: home.getState().displayName,
      residenceType: home.getState().residenceType,
      version: home.getState().version,
      createdAt: home.getState().createdAt,
      updatedAt: home.getState().updatedAt,
    });

    const connectionId = crypto.randomUUID();
    await repo.createLocationConnection(tx, {
      id: connectionId,
      worldId: worldRecord.id,
      fromLocationId: locationRecord.id,
      toLocationId: secondLocationRecord.id,
      connectionType: "path",
      traversalCost: 1,
      isBidirectional: true,
      accessibilityRequirement: null,
      description: `Path from ${locationRecord.displayName} to ${secondLocationRecord.displayName}`,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const residenceId = crypto.randomUUID();
    await repo.createCharacterResidence(tx, {
      id: residenceId,
      characterId: input.characterId,
      worldId: worldRecord.id,
      homeId: homeRecord.id,
      isActive: true,
      residenceType: "primary",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const environmentSnapshotId = crypto.randomUUID();
    await repo.createEnvironmentSnapshot(tx, {
      id: environmentSnapshotId,
      worldId: worldRecord.id,
      regionId: regionRecord.id,
      snapshotType: "initial",
      environmentVector: {},
      anomalyLevel: "stable",
      snapshotMetadata: {},
      version: 1,
      createdAt: new Date(),
    });

    const manifestData = world.toBootstrapManifest(
      input.originPackage as never,
    );
    const manifestRecord = await repo.createBootstrapManifest(tx, {
      id: crypto.randomUUID(),
      worldId: worldRecord.id,
      universeSeed: manifestData.universeSeed,
      originSeed: manifestData.originSeed,
      acceptedCandidateSeed: manifestData.acceptedCandidateSeed,
      generatorVersion: manifestData.generatorVersion,
      vectorVersion: manifestData.vectorVersion,
      originPackagePayload: manifestData.originPackagePayload,
      createdAt: new Date(),
    });

    const checkpointRecord = await repo.createCheckpoint(tx, {
      id: crypto.randomUUID(),
      worldId: worldRecord.id,
      checkpointSequence: 1,
      worldVersion: 1,
      stateHash: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      description: "World bootstrap: first region, location, and home created",
      createdAt: new Date(),
    });

    await repo.upsertCharacterLocation(tx, {
      characterId: input.characterId,
      worldId: worldRecord.id,
      locationId: locationRecord.id,
      enteredAt: new Date(),
      version: 1,
    });

    await repo.createMovementEvent(tx, {
      id: crypto.randomUUID(),
      characterId: input.characterId,
      worldId: worldRecord.id,
      fromLocationId: null,
      toLocationId: locationRecord.id,
      moveType: "arrival",
      createdAt: new Date(),
    });

    await recordDomainEventWithTx(tx, {
      worldId: worldRecord.id,
      eventType: "WORLD_CREATED",
      aggregateVersion: 1,
      actorHouseholdId: input.householdId,
      actorUserId: input.actorUserId,
      payload: {
        originSeed: input.originSeed,
        characterId: input.characterId,
        regionId: regionRecord.id,
        locationId: locationRecord.id,
        homeId: homeRecord.id,
      },
    });

    return {
      worldId: worldRecord.id,
      regionId: regionRecord.id,
      locationId: locationRecord.id,
      homeId: homeRecord.id,
      secondLocationId: secondLocationRecord.id,
      connectionId,
      residenceId,
      environmentSnapshotId,
      manifestId: manifestRecord.id,
      checkpointId: checkpointRecord.id,
    };
  });

  return result;
}

export async function getWorldForCharacter(characterId: string) {
  const db = getDb();
  const repo = new DrizzleWorldRepository();
  return repo.findWorldByCharacterId(db, characterId);
}

export async function getWorldById(worldId: string) {
  const db = getDb();
  const repo = new DrizzleWorldRepository();
  return repo.findWorldById(db, worldId);
}

export async function archiveWorld(worldId: string) {
  const db = getDb();
  const repo = new DrizzleWorldRepository();

  const record = await repo.findWorldById(db, worldId);
  if (!record) throw new NotFoundError("World", worldId);

  const world = World.fromState({
    id: record.id,
    householdId: record.householdId,
    childProfileId: record.childProfileId,
    characterId: record.characterId,
    universeSeed: record.universeSeed,
    originSeed: record.originSeed,
    acceptedCandidateSeed: record.acceptedCandidateSeed,
    generatorVersion: record.generatorVersion,
    vectorVersion: record.vectorVersion,
    lifecycleStatus: record.lifecycleStatus as never,
    version: record.version,
    metadata: record.metadata as Record<string, unknown>,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    archivedAt: record.archivedAt,
  });

  world.archive();
  const newState = world.getState();

  await db.transaction(async (tx) => {
    await tx
      .update(worlds)
      .set({
        lifecycleStatus: newState.lifecycleStatus,
        archivedAt: newState.archivedAt,
        updatedAt: new Date(),
        version: newState.version,
      })
      .where(eq(worlds.id, worldId));

    await recordDomainEventWithTx(tx, {
      worldId,
      eventType: "WORLD_ARCHIVED",
      aggregateVersion: newState.version,
      payload: {
        characterId: record.characterId,
        previousStatus: record.lifecycleStatus,
      },
    });
  });

  return newState;
}
