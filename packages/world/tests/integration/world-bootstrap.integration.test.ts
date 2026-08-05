import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "../../src/db/schema/world";
import type { Database } from "../../src/db/client";
import { DrizzleWorldRepository } from "../../src/db/repositories/drizzle/drizzle-world.repository";
import {
  createWorldFromOrigin,
  __setTestWorldDb,
} from "../../src/application/world-bootstrap.service";
import {
  moveCharacterToLocation,
  __setTestMoveDb,
} from "../../src/application/movement.service";

const ENABLE_DESTRUCTIVE = process.env.WORLD_TEST_ENABLE_DESTRUCTIVE === "true";
const DATABASE_URL = process.env.WORLD_TEST_DATABASE_URL;
const LUMI_DB_NAMES = ["lumi", "postgres", "template1", "template0"];

function getSafeDbName(url: string): string {
  const u = new URL(url);
  const dbName = u.pathname.replace(/^\//, "").split("?")[0]!;
  if (!dbName) {
    throw new Error(
      `[WORLD-DESTRUCTIVE-TEST] Empty DB name parsed from: ${url}`,
    );
  }
  if (LUMI_DB_NAMES.includes(dbName)) {
    throw new Error(
      `[WORLD-DESTRUCTIVE-TEST] DESTRUCTIVE TEST BLOCKED for production DB: "${dbName}". ` +
        `World destructive tests require a disposable DB name containing "test" or "review".`,
    );
  }
  if (!dbName.includes("test") && !dbName.includes("review")) {
    throw new Error(
      `[WORLD-DESTRUCTIVE-TEST] UNSAFE DB NAME: "${dbName}". ` +
        `Destructive tests require DB name containing "test" or "review". ` +
        `Got: ${dbName}`,
    );
  }
  return dbName;
}

function isDestructiveEnabled(): boolean {
  if (!ENABLE_DESTRUCTIVE) {
    throw new Error(
      "[WORLD-DESTRUCTIVE-TEST] WORLD_TEST_ENABLE_DESTRUCTIVE is not set to true. " +
        "Set WORLD_TEST_ENABLE_DESTRUCTIVE=true and WORLD_TEST_DATABASE_URL to a disposable database.",
    );
  }
  if (!DATABASE_URL) {
    throw new Error(
      "[WORLD-DESTRUCTIVE-TEST] WORLD_TEST_DATABASE_URL is not set. " +
        "Set WORLD_TEST_DATABASE_URL to a disposable test database.",
    );
  }
  getSafeDbName(DATABASE_URL);
  return true;
}

describe("World bootstrap integration (destructive)", () => {
  let pool: pg.Pool;
  let queryClient: ReturnType<typeof postgres>;
  let db: Database;
  let repo: DrizzleWorldRepository;
  let householdId: string;
  let childProfileId: string;
  let characterId: string;

  beforeAll(async () => {
    if (!isDestructiveEnabled()) return;

    pool = new pg.Pool({ connectionString: DATABASE_URL });

    // Run migrations as-is — they target profile.* schema
    // This works because Drizzle schema also targets profile.* via pgSchema("profile")
    const migrationDir = resolve(import.meta.dirname, "..", "..", "migrations");
    const files = readdirSync(migrationDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const sql = readFileSync(resolve(migrationDir, file), "utf-8");
      await pool.query(sql);
    }

    queryClient = postgres(DATABASE_URL!, { max: 1 });
    const drizzleDb = drizzle(queryClient, { schema });
    db = drizzleDb as unknown as Database;
    repo = new DrizzleWorldRepository();

    householdId = crypto.randomUUID();
    childProfileId = crypto.randomUUID();
    characterId = crypto.randomUUID();

    __setTestWorldDb(db);
    __setTestMoveDb(db);
  });

  afterAll(async () => {
    // Clean up: drop the entire profile schema (safe only in disposable DB)
    try {
      if (pool) {
        try {
          await pool.query("DROP SCHEMA IF EXISTS profile CASCADE");
        } catch {
          /* ignore */
        }
      }
    } finally {
      try {
        if (queryClient) {
          try {
            await queryClient.end();
          } catch {
            /* ignore */
          }
        }
        if (pool) {
          try {
            await pool.end();
          } catch {
            /* ignore */
          }
        }
      } finally {
        __setTestWorldDb(undefined);
        __setTestMoveDb(undefined);
      }
    }
  });

  it("creates world from origin package with region, location, home, connection, residence and environment", async () => {
    const result = await createWorldFromOrigin({
      householdId,
      childProfileId,
      characterId,
      universeSeed: "test-universe-seed-001",
      originSeed: "test-origin-seed-001",
      acceptedCandidateSeed: "test-candidate-seed-001",
      generatorVersion: "v1.0.0",
      vectorVersion: "v1.0.0",
      originPackage: {
        characterType: "sea_creature",
        subtype: "fish",
        originConcept: "A curious fish exploring a coral reef",
        startingRegionArchetype: "Coral Reef",
        startingLocation: "Bright Coral Garden",
        homeArchetype: "Coral Cottage",
        nearbyNpcSeed: "friendly_seahorse",
        firstMysterySeed: "glowing_shell",
      },
      actorUserId: crypto.randomUUID(),
    });

    expect(result.worldId).toBeTruthy();
    expect(result.regionId).toBeTruthy();
    expect(result.locationId).toBeTruthy();
    expect(result.homeId).toBeTruthy();
    expect(result.manifestId).toBeTruthy();
    expect(result.checkpointId).toBeTruthy();
    expect(result.secondLocationId).toBeTruthy();
    expect(result.connectionId).toBeTruthy();
    expect(result.residenceId).toBeTruthy();
    expect(result.environmentSnapshotId).toBeTruthy();

    const worldRecord = await repo.findWorldById(db, result.worldId);
    expect(worldRecord).toBeTruthy();
    expect(worldRecord!.lifecycleStatus).toBe("active");

    const regions = await repo.findRegionsByWorldId(db, result.worldId);
    expect(regions.length).toBeGreaterThanOrEqual(1);

    const locations = await repo.findLocationsByWorldId(db, result.worldId);
    expect(locations.length).toBeGreaterThanOrEqual(2);

    const home = await repo.findHomeByWorldId(db, result.worldId);
    expect(home).toBeTruthy();

    const manifest = await repo.findBootstrapManifestByWorldId(
      db,
      result.worldId,
    );
    expect(manifest).toBeTruthy();

    // Verify connections exist
    const connections = await repo.findConnectionsByWorldId(db, result.worldId);
    expect(connections.length).toBeGreaterThanOrEqual(1);

    // Verify residence exists
    const residences = await repo.findResidencesByCharacterId(db, characterId);
    expect(residences.length).toBeGreaterThanOrEqual(1);

    // Verify environment snapshots exist
    const envSnapshots = await repo.findEnvironmentSnapshotsByWorldId(
      db,
      result.worldId,
    );
    expect(envSnapshots.length).toBeGreaterThanOrEqual(1);
  });

  it("moves character to second accessible location via connection graph", async () => {
    const moveCharId = crypto.randomUUID();
    const worldResult = await createWorldFromOrigin({
      householdId,
      childProfileId,
      characterId: moveCharId,
      universeSeed: "move-test-seed-002",
      originSeed: "move-test-origin-002",
      acceptedCandidateSeed: "move-test-candidate-002",
      generatorVersion: "v1.0.0",
      vectorVersion: "v1.0.0",
      originPackage: {
        characterType: "dragon",
        subtype: "dragon",
        originConcept: "A young dragon in a volcanic mountain",
        startingRegionArchetype: "Volcanic Mountain",
        startingLocation: "Dragon's Lair",
        homeArchetype: "Warm Cave",
        nearbyNpcSeed: "wise_owl",
        firstMysterySeed: "ancient_egg",
      },
      actorUserId: crypto.randomUUID(),
    });

    const locResult = await moveCharacterToLocation({
      characterId: moveCharId,
      targetLocationId: worldResult.secondLocationId,
      householdId,
      moveType: "movement",
    });

    expect(locResult.newLocationId).toBe(worldResult.secondLocationId);
    expect(locResult.moveType).toBe("movement");
  });

  it("rejects move to non-accessible location with LOCATION_NOT_ACCESSIBLE", async () => {
    const blockCharId = crypto.randomUUID();
    const worldResult = await createWorldFromOrigin({
      householdId,
      childProfileId,
      characterId: blockCharId,
      universeSeed: "blocked-test-seed-003",
      originSeed: "blocked-test-origin-003",
      acceptedCandidateSeed: "blocked-test-candidate-003",
      generatorVersion: "v1.0.0",
      vectorVersion: "v1.0.0",
      originPackage: {
        characterType: "human",
        subtype: "explorer",
        originConcept: "An explorer in a mysterious forest",
        startingRegionArchetype: "Enchanted Forest",
        startingLocation: "Forest Edge",
        homeArchetype: "Wooden Cabin",
        nearbyNpcSeed: "friendly_squirrel",
        firstMysterySeed: "hidden_trail",
      },
      actorUserId: crypto.randomUUID(),
    });

    const blockedLocationId = crypto.randomUUID();
    await repo.createLocation(db, {
      id: blockedLocationId,
      worldId: worldResult.worldId,
      regionId: worldResult.regionId,
      locationKey: "blocked-cave",
      displayName: "Blocked Cave",
      accessibilityStatus: "blocked",
      locationType: "cave",
      occupancyLevel: "empty",
      safetyLevel: "dangerous",
      isHome: false,
      metadata: {},
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      moveCharacterToLocation({
        characterId: blockCharId,
        targetLocationId: blockedLocationId,
        householdId,
        moveType: "movement",
      }),
    ).rejects.toThrow("LOCATION_NOT_ACCESSIBLE");
  });

  it("bootstrap manifest preserves origin package", async () => {
    const originPackage = {
      characterType: "sky_creature",
      subtype: "dragon",
      originConcept: "A young dragon learning to fly",
      startingRegionArchetype: "Cloud Islands",
      startingLocation: "Soaring Peak",
      homeArchetype: "Cloud Nest",
      nearbyNpcSeed: "elder_phoenix",
      firstMysterySeed: "storm_crystal",
    };

    const result = await createWorldFromOrigin({
      householdId: crypto.randomUUID(),
      childProfileId: crypto.randomUUID(),
      characterId: crypto.randomUUID(),
      universeSeed: "manifest-test-seed-004",
      originSeed: "manifest-test-origin-004",
      acceptedCandidateSeed: "manifest-test-candidate-004",
      generatorVersion: "v1.0.0",
      vectorVersion: "v1.0.0",
      originPackage,
      actorUserId: crypto.randomUUID(),
    });

    const manifest = await repo.findBootstrapManifestByWorldId(
      db,
      result.worldId,
    );
    expect(manifest).toBeTruthy();
    expect(manifest!.originSeed).toBe("manifest-test-origin-004");
    expect(manifest!.acceptedCandidateSeed).toBe("manifest-test-candidate-004");

    const payload = manifest!.originPackagePayload as Record<string, unknown>;
    expect(payload.originConcept).toBe(originPackage.originConcept);
  });

  it("slugifies non-ascii starter archetypes and locations during bootstrap", async () => {
    const result = await createWorldFromOrigin({
      householdId: crypto.randomUUID(),
      childProfileId: crypto.randomUUID(),
      characterId: crypto.randomUUID(),
      universeSeed: "slug-seed-006",
      originSeed: "slug-origin-006",
      acceptedCandidateSeed: "slug-candidate-006",
      generatorVersion: "v1.0.0",
      vectorVersion: "v1.0.0",
      originPackage: {
        characterType: "explorer",
        subtype: "mermaid",
        originConcept: "A mermaid exploring coral gardens.",
        startingRegionArchetype: "Mercan Resifleri",
        startingLocation: "Mercan Sarayı",
        homeArchetype: "İnciden Ev",
        nearbyNpcSeed: "playful_dolphin",
        firstMysterySeed: "sunken_map",
      },
      actorUserId: crypto.randomUUID(),
    });

    const regions = await repo.findRegionsByWorldId(db, result.worldId);
    const locations = await repo.findLocationsByWorldId(db, result.worldId);

    expect(regions[0]?.regionKey).toBe("starting-mercan-resifleri");
    expect(locations[0]?.locationKey).toBe("mercan-saray");
  });
  it("creates checkpoint during bootstrap", async () => {
    const result = await createWorldFromOrigin({
      householdId: crypto.randomUUID(),
      childProfileId: crypto.randomUUID(),
      characterId: crypto.randomUUID(),
      universeSeed: "checkpoint-seed-005",
      originSeed: "checkpoint-origin-005",
      acceptedCandidateSeed: "checkpoint-candidate-005",
      generatorVersion: "v1.0.0",
      vectorVersion: "v1.0.0",
      originPackage: {
        characterType: "animal",
        subtype: "fox",
        originConcept: "A brave fox in an enchanted forest",
        startingRegionArchetype: "Enchanted Forest",
        startingLocation: "Mossy Clearing",
        homeArchetype: "Cozy Den",
        nearbyNpcSeed: "wise_rabbit",
        firstMysterySeed: "glowing_mushrooms",
      },
      actorUserId: crypto.randomUUID(),
    });

    const checkpoints = await repo.findCheckpointsByWorldId(db, result.worldId);
    expect(checkpoints.length).toBeGreaterThanOrEqual(1);
    expect(checkpoints[0]!.description).toContain("World bootstrap");
  });
});
