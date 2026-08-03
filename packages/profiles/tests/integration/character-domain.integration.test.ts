import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DrizzleHouseholdRepository } from "../../src/db/repositories/drizzle/drizzle-household.repository";
import { DrizzleChildProfileRepository } from "../../src/db/repositories/drizzle/drizzle-child-profile.repository";
import { DrizzleCharacterRepository } from "../../src/db/repositories/drizzle/drizzle-character.repository";
import { DrizzleCharacterDomainRepository } from "../../src/db/repositories/drizzle/drizzle-character-domain.repository";
import type { QueryExecutor } from "../../src/db/client";
import { DomainError, NotFoundError } from "../../src/domain";
import type { CharacterEventType } from "../../src/domain/events";
import {
  applyTraitDeltas,
  updateNeeds,
  updateEmotions,
  upsertInfluence,
  addGoal,
  completeGoal,
  addRelationship,
  updateLocation,
  getCharacterDomain,
  __setTestDb,
} from "../../src/application/character-domain.service";

let queryClient: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle> | undefined;
// Set at module load from env so collection-time gating (it.runIf) is correct.
const destructiveEnvEnabled =
  !!process.env.PROFILE_TEST_DATABASE_URL && process.env.PROFILE_TEST_ENABLE_DESTRUCTIVE === "true";
let destructiveTestsEnabled = destructiveEnvEnabled;

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATION_DIR = resolve(__dirname, "..", "..", "migrations");

beforeAll(async () => {
  const databaseUrl = process.env.PROFILE_TEST_DATABASE_URL;
  const allowDestructive = process.env.PROFILE_TEST_ENABLE_DESTRUCTIVE === "true";

  if (!databaseUrl || !allowDestructive) {
    console.warn(
      "Skipping character domain integration tests: PROFILE_TEST_DATABASE_URL + PROFILE_TEST_ENABLE_DESTRUCTIVE=true required.",
    );
    return;
  }

  try {
    queryClient = postgres(databaseUrl, { max: 1 });
    db = drizzle(queryClient);
    destructiveTestsEnabled = true;

    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS profile`);
    await db.execute(sql`DROP SCHEMA IF EXISTS profile CASCADE`);
    await db.execute(sql`CREATE SCHEMA profile`);

    const migrationFiles = readdirSync(MIGRATION_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of migrationFiles) {
      const path = join(MIGRATION_DIR, file);
      const content = readFileSync(path, "utf-8");
      await db.execute(sql.raw(content));
    }
  } catch (error) {
    destructiveTestsEnabled = false;
    console.warn("Character domain integration database unavailable - skipping tests");
    console.warn(error);
  }
});

afterAll(async () => {
  if (queryClient && destructiveTestsEnabled && db) {
    await db.execute(sql`DROP SCHEMA IF EXISTS profile CASCADE`);
    await queryClient.end();
  }
});

function itIfDb(name: string, fn: () => Promise<void> | void) {
  // Use runIf so the skip decision is made at runtime, after beforeAll has set
  // destructiveTestsEnabled based on a real DB connection.
  return (it as unknown as { runIf: (cond: boolean) => (n: string, f: () => Promise<void> | void) => void }).runIf(destructiveTestsEnabled)(name, fn);
}

async function setupCharacter() {
  const d = db!;
  const householdRepo = new DrizzleHouseholdRepository(d as never);
  const childRepo = new DrizzleChildProfileRepository(d as never);
  const characterRepo = new DrizzleCharacterRepository(d as never);

  const household = await householdRepo.create({
    id: crypto.randomUUID(),
    name: "S06 Domain Test Family",
    slug: `s06-domain-${crypto.randomUUID().slice(0, 8)}`,
  });
  await householdRepo.addMember({
    householdId: household.id,
    userId: TEST_USER_ID,
    membershipRole: "owner",
  });

  const profile = await childRepo.create({
    id: crypto.randomUUID(),
    householdId: household.id,
    displayName: "S06 Domain Child",
    ageBand: "6-8",
  });

  const character = await characterRepo.create({
    id: crypto.randomUUID(),
    childProfileId: profile.id,
    householdId: household.id,
    name: "Test Lumi",
    broadKind: "human",
    characterType: "explorer",
    subtype: "yıldız kaşifi",
    originMode: "auto",
    firstOriginPackageId: crypto.randomUUID(),
    originConcept: "Test concept",
    startingRegionArchetype: "forest",
    startingLocation: "entrance",
    homeArchetype: "treehouse",
    nearbyNpcSeed: "elder",
    firstMysterySeed: "song",
    universeSeed: "test-seed",
    safetyBounds: { ageBand: "6-8", contentBoundary: "moderate", requireParentApprovalForAi: false },
    characterSubtype: "child_avatar",
    lifecycleStage: "childhood",
    version: 1,
  });

  return { household, profile, character, householdRepo, childRepo, characterRepo, db: d };
}

function getDomainRepo(dbExecutor: QueryExecutor) {
  return new DrizzleCharacterDomainRepository(dbExecutor);
}

describe("S06 - Character Domain Repository Integration (DB-gated)", () => {
  itIfDb("trait state upsert and get", async () => {
    const { character, db: d } = await setupCharacter();
    const repo = getDomainRepo(d as never);

    await repo.upsertTraitState({ characterId: character.id, dimension: "courage", value: 0.7 });
    await repo.upsertTraitState({ characterId: character.id, dimension: "curiosity", value: 0.8 });

    const traits = await repo.getTraitStates(character.id);
    expect(traits).toHaveLength(2);
    const courage = traits.find((t) => t.dimension === "courage");
    expect(courage?.value).toBe(0.7);
  });

  itIfDb("trait history append", async () => {
    const { character, db: d } = await setupCharacter();
    const repo = getDomainRepo(d as never);

    await repo.createTraitHistory({
      id: crypto.randomUUID(),
      characterId: character.id,
      dimension: "courage",
      oldValue: 0.5,
      newValue: 0.6,
      evidence: "Test evidence",
      deltaMagnitude: 0.1,
      actorHouseholdId: character.householdId,
      actorUserId: TEST_USER_ID,
    });

    const history = await repo.getTraitHistory(character.id);
    expect(history).toHaveLength(1);
    expect(history[0]?.deltaMagnitude).toBe(0.1);
  });

  itIfDb("emotion state persistence", async () => {
    const { character, db: d } = await setupCharacter();
    const repo = getDomainRepo(d as never);

    await repo.upsertEmotionState({ characterId: character.id, dimension: "joy", value: 0.8 });
    const emotions = await repo.getEmotionStates(character.id);
    expect(emotions).toHaveLength(1);
    expect(emotions[0]?.value).toBe(0.8);
  });

  itIfDb("needs persistence", async () => {
    const { character, db: d } = await setupCharacter();
    const repo = getDomainRepo(d as never);

    await repo.upsertNeed({ characterId: character.id, needType: "hunger", value: 0.5, decay: 0.05 });
    const needs = await repo.getNeeds(character.id);
    expect(needs).toHaveLength(1);
    expect(needs[0]?.needType).toBe("hunger");
  });

  itIfDb("goals persistence", async () => {
    const { character, db: d } = await setupCharacter();
    const repo = getDomainRepo(d as never);

    const goalId = crypto.randomUUID();
    await repo.createGoal({
      id: goalId,
      characterId: character.id,
      needType: "curiosity",
      description: "Explore the forest",
      priority: 1,
      status: "active",
    });
    const goals = await repo.getGoals(character.id);
    expect(goals).toHaveLength(1);

    await repo.updateGoal(goalId, character.id, { status: "completed" });
    const updated = await repo.getGoals(character.id);
    expect(updated[0]?.status).toBe("completed");
  });

  itIfDb("influence persistence", async () => {
    const { character, db: d } = await setupCharacter();
    const repo = getDomainRepo(d as never);

    await repo.upsertInfluence(character.id, { emotional: 0.5, social: 0.3, cultural: 0.1, educational: 0.2, political: 0, environmental: 0.6, familial: 0.7, spiritual: 0, historical: 0.1 });
    const influence = await repo.getInfluence(character.id);
    expect(influence).not.toBeNull();
    expect(influence!.emotional).toBe(0.5);
  });

  itIfDb("relationships persistence", async () => {
    const { character, db: d } = await setupCharacter();
    const repo = getDomainRepo(d as never);
    const charRepo = new DrizzleCharacterRepository(d as never);

    // Create a target character that satisfies the FK constraint.
    // The active-per-profile unique index requires deletedAt to be set when a second
    // character shares the same child_profile_id.
    const target = await charRepo.create({
      id: crypto.randomUUID(),
      childProfileId: character.childProfileId,
      householdId: character.householdId,
      name: "Target NPC",
      broadKind: "human",
      characterType: "helper",
      subtype: "shopkeeper",
      originMode: "auto",
      firstOriginPackageId: crypto.randomUUID(),
      originConcept: "Test target",
      startingRegionArchetype: "village",
      startingLocation: "market",
      homeArchetype: "shop",
      nearbyNpcSeed: "neighbor",
      firstMysterySeed: "package",
      universeSeed: "target-seed",
      safetyBounds: { ageBand: "6-8", contentBoundary: "moderate", requireParentApprovalForAi: false },
      characterSubtype: "npc",
      lifecycleStage: "adulthood",
      version: 1,
      deletedAt: new Date(),
    });

    await repo.createRelationship({
      characterId: character.id,
      targetCharacterId: target.id,
      trust: 0.7,
      affinity: 0.6,
      familiarity: 0.4,
      relationshipType: "friend",
    });
    const rels = await repo.getRelationships(character.id);
    expect(rels).toHaveLength(1);
  });

  itIfDb("domain event persistence", async () => {
    const { character, db: d } = await setupCharacter();
    const repo = getDomainRepo(d as never);

    await repo.createDomainEvent({
      id: crypto.randomUUID(),
      characterId: character.id,
      eventType: "CHARACTER_TRAIT_CHANGED",
      eventVersion: 1,
      aggregateVersion: 2,
      actorHouseholdId: character.householdId,
      actorUserId: TEST_USER_ID,
      payload: { characterId: character.id },
    });

    const events = await repo.getDomainEvents(character.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("CHARACTER_TRAIT_CHANGED");
  });
});

describe("S06 - Transaction Rollback [repo-level] (DB-gated)", () => {
  itIfDb("[repo-level] rolls back domain writes on version conflict", async () => {
    const { character, db: d } = await setupCharacter();
    const domainRepo = getDomainRepo(d as never);

    const charRepo = new DrizzleCharacterRepository(d as never);

    // First mutation succeeds
    await d.transaction(async (tx) => {
      const txCharRepo = new DrizzleCharacterRepository(tx as never);
      const txDomainRepo = new DrizzleCharacterDomainRepository(tx as never);

      await txCharRepo.update(character.id, character.householdId, {
        version: 2,
        expectedVersion: 1,
      });

      await txDomainRepo.upsertTraitState({ characterId: character.id, dimension: "courage", value: 0.8 });
    });

    // Second mutation with stale version should fail AND rollback trait write
    const secondAttempt = d.transaction(async (tx) => {
      const txCharRepo = new DrizzleCharacterRepository(tx as never);
      const txDomainRepo = new DrizzleCharacterDomainRepository(tx as never);

      // This correctly expects version 2 but passes 1 - will conflict
      await txCharRepo.update(character.id, character.householdId, {
        version: 2,
        expectedVersion: 1,
      });

      await txDomainRepo.upsertTraitState({ characterId: character.id, dimension: "curiosity", value: 0.9, updatedAt: new Date() });
    });

    await expect(secondAttempt).rejects.toThrow(DomainError);

    // Verify trait state from first mutation persisted
    const traits = await domainRepo.getTraitStates(character.id);
    expect(traits).toHaveLength(1);
    expect(traits[0]?.dimension).toBe("courage");

    // Verify character version didn't advance past 2
    const finalRecord = await charRepo.findById(character.id, character.householdId);
    expect(finalRecord?.version).toBe(2);
  });

  itIfDb("[repo-level] rolls back event write on version conflict", async () => {
    const { character, db: d } = await setupCharacter();
    const domainRepo = getDomainRepo(d as never);
    const charRepo = new DrizzleCharacterRepository(d as never);

    // First mutation succeeds
    await d.transaction(async (tx) => {
      const txCharRepo = new DrizzleCharacterRepository(tx as never);
      const txDomainRepo = new DrizzleCharacterDomainRepository(tx as never);

      await txCharRepo.update(character.id, character.householdId, {
        version: 2,
        expectedVersion: 1,
      });

      await txDomainRepo.upsertTraitState({ characterId: character.id, dimension: "courage", value: 0.5 });
      await txDomainRepo.createDomainEvent({
        id: crypto.randomUUID(),
        characterId: character.id,
        eventType: "CHARACTER_TRAIT_CHANGED",
        eventVersion: 1,
        aggregateVersion: 2,
        actorHouseholdId: character.householdId,
        actorUserId: TEST_USER_ID,
        payload: {},
      });
    });

    // Second mutation with stale version
    const secondAttempt = d.transaction(async (tx) => {
      const txCharRepo = new DrizzleCharacterRepository(tx as never);
      const txDomainRepo = new DrizzleCharacterDomainRepository(tx as never);

      await txCharRepo.update(character.id, character.householdId, {
        version: 2,
        expectedVersion: 1,
      });

      await txDomainRepo.upsertTraitState({ characterId: character.id, dimension: "curiosity", value: 0.9, updatedAt: new Date() });
      await txDomainRepo.createDomainEvent({
        id: crypto.randomUUID(),
        characterId: character.id,
        eventType: "CHARACTER_TRAIT_CHANGED",
        eventVersion: 1,
        aggregateVersion: 2,
        actorHouseholdId: character.householdId,
        actorUserId: TEST_USER_ID,
        payload: {},
      });
    });

    await expect(secondAttempt).rejects.toThrow(DomainError);

    // Verify no event from second mutation
    const events = await domainRepo.getDomainEvents(character.id);
    expect(events).toHaveLength(1);
  });
});

describe("S06 - Optimistic Version Conflict [repo-level] (DB-gated)", () => {
  itIfDb("[repo-level] two concurrent mutations - first succeeds, second gets VERSION_CONFLICT", async () => {
    const { character, db: d } = await setupCharacter();
    const charRepo = new DrizzleCharacterRepository(d as never);

    // Both expect version 1
    const first = d.transaction(async (tx) => {
      const txCharRepo = new DrizzleCharacterRepository(tx as never);
      const txDomainRepo = new DrizzleCharacterDomainRepository(tx as never);

      await txCharRepo.update(character.id, character.householdId, {
        version: 2,
        expectedVersion: 1,
      });
      await txDomainRepo.upsertTraitState({ characterId: character.id, dimension: "courage", value: 0.8 });
    });

    const second = d.transaction(async (tx) => {
      const txCharRepo = new DrizzleCharacterRepository(tx as never);
      const txDomainRepo = new DrizzleCharacterDomainRepository(tx as never);

      await txCharRepo.update(character.id, character.householdId, {
        version: 2,
        expectedVersion: 1,
      });
      await txDomainRepo.upsertTraitState({ characterId: character.id, dimension: "curiosity", value: 0.9, updatedAt: new Date() });
    });

    // Run both concurrently
    const results = await Promise.allSettled([first, second]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectedReason).toBeInstanceOf(DomainError);
    expect(rejectedReason.code).toBe("VERSION_CONFLICT");

    // Verify only one trait state was persisted
    const domainRepo = getDomainRepo(d as never);
    const traits = await domainRepo.getTraitStates(character.id);
    expect(traits).toHaveLength(1);

    // Verify version is 2
    const record = await charRepo.findById(character.id, character.householdId);
    expect(record?.version).toBe(2);
  });
});

describe("S06 - Service-Level Mutation Audit (DB-gated)", () => {
  beforeEach(() => {
    __setTestDb(db as never);
  });
  afterEach(() => {
    __setTestDb(undefined);
  });

  function getTestUserId(char: { householdId: string }) {
    return TEST_USER_ID;
  }

  itIfDb("uses test DB for both getRepos() reads and resolveDb() writes after __setTestDb injection", async () => {
    const { character, db: d } = await setupCharacter();

    const domainRepo = new DrizzleCharacterDomainRepository(d as never);
    await domainRepo.upsertTraitState({ characterId: character.id, dimension: "courage", value: 0.7 });

    const charRepo = new DrizzleCharacterRepository(d as never);
    await charRepo.update(character.id, character.householdId, {
      version: 2, expectedVersion: 1,
    });

    const result = await getCharacterDomain(TEST_USER_ID, character.householdId, character.id);

    expect(result.traits.courage).toBe(0.7);
    expect(result.version).toBe(2);
  });

  itIfDb("applyTraitDeltas (single delta) produces event + trait state + history + version=2", async () => {
    const { character } = await setupCharacter();
    const serviceResult = await applyTraitDeltas(
      TEST_USER_ID, character.householdId, character.id,
      [{ dimension: "courage", oldValue: 0.5, newValue: 0.65, evidence: "test", deltaMagnitude: 0.15 }],
    );

    expect(serviceResult.version).toBe(2);
    expect(serviceResult.traits.courage).toBe(0.65);

    const charRepo = new DrizzleCharacterRepository(db! as never);
    const dbRecord = await charRepo.findById(character.id, character.householdId);
    expect(dbRecord?.version).toBe(2);

    const domainRepo = getDomainRepo(db! as never);
    const events = await domainRepo.getDomainEvents(character.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("CHARACTER_TRAIT_CHANGED");
    expect(events[0]?.aggregateVersion).toBe(2);

    const history = await domainRepo.getTraitHistory(character.id);
    expect(history).toHaveLength(1);
    expect(history[0]?.dimension).toBe("courage");
  });

  itIfDb("applyTraitDeltas (multi-delta) version consistency: response.version === DB.version === event.aggregateVersion", async () => {
    const { character } = await setupCharacter();

    const serviceResult = await applyTraitDeltas(
      TEST_USER_ID, character.householdId, character.id,
      [
        { dimension: "courage", oldValue: 0.5, newValue: 0.65, evidence: "test", deltaMagnitude: 0.15 },
        { dimension: "curiosity", oldValue: 0.6, newValue: 0.75, evidence: "test", deltaMagnitude: 0.15 },
      ],
    );

    expect(serviceResult.version).toBe(2);
    expect(serviceResult.traits.courage).toBe(0.65);
    expect(serviceResult.traits.curiosity).toBe(0.75);

    const charRepo = new DrizzleCharacterRepository(db! as never);
    const dbRecord = await charRepo.findById(character.id, character.householdId);
    expect(dbRecord?.version).toBe(2);

    const domainRepo = getDomainRepo(db! as never);
    const events = await domainRepo.getDomainEvents(character.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("CHARACTER_TRAIT_CHANGED");
    expect(events[0]?.aggregateVersion).toBe(2);

    const history = await domainRepo.getTraitHistory(character.id);
    expect(history).toHaveLength(2);
  });

  itIfDb("updateEmotions produces CHARACTER_EMOTION_UPDATED event with version=2", async () => {
    const { character } = await setupCharacter();
    const emotions = { joy: 0.9, sadness: 0.1, fear: 0.1, anger: 0.1, surprise: 0.3, trust: 0.6 };

    const result = await updateEmotions(TEST_USER_ID, character.householdId, character.id, emotions);

    expect(result.version).toBe(2);
    expect(result.emotions.joy).toBe(0.9);

    const charRepo = new DrizzleCharacterRepository(db! as never);
    const dbRecord = await charRepo.findById(character.id, character.householdId);
    expect(dbRecord?.version).toBe(2);

    const domainRepo = getDomainRepo(db! as never);
    const events = await domainRepo.getDomainEvents(character.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("CHARACTER_EMOTION_UPDATED");
    expect(events[0]?.aggregateVersion).toBe(2);
  });

  itIfDb("updateNeeds produces CHARACTER_NEEDS_UPDATED event with version=2", async () => {
    const { character } = await setupCharacter();
    const needs = [{ needType: "hunger" as const, value: 0.3, decay: 0.05 }];

    const result = await updateNeeds(TEST_USER_ID, character.householdId, character.id, needs);

    expect(result.version).toBe(2);

    const domainRepo = getDomainRepo(db! as never);
    const events = await domainRepo.getDomainEvents(character.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("CHARACTER_NEEDS_UPDATED");
    expect(events[0]?.aggregateVersion).toBe(2);
  });

  itIfDb("addGoal + completeGoal produce events with correct versions", async () => {
    const { character } = await setupCharacter();

    const addResult = await addGoal(TEST_USER_ID, character.householdId, character.id, {
      needType: "curiosity", description: "Explore the forest", priority: 1,
    });

    expect(addResult.version).toBe(2);

    const goals = addResult.goals.filter((g) => g.status === "active");
    expect(goals).toHaveLength(1);

    const completeResult = await completeGoal(TEST_USER_ID, character.householdId, character.id, goals[0]!.id);

    expect(completeResult.version).toBe(3);

    const domainRepo = getDomainRepo(db! as never);
    const events = await domainRepo.getDomainEvents(character.id);
    const addEvent = events.find((e) => e.eventType === "CHARACTER_GOAL_ADDED");
    const completeEvent = events.find((e) => e.eventType === "CHARACTER_GOAL_COMPLETED");
    expect(addEvent).toBeDefined();
    expect(completeEvent).toBeDefined();
    expect(addEvent!.aggregateVersion).toBe(2);
    expect(completeEvent!.aggregateVersion).toBe(3);
  });

  itIfDb("upsertInfluence produces CHARACTER_INFLUENCE_UPDATED event with version=2", async () => {
    const { character } = await setupCharacter();

    const result = await upsertInfluence(TEST_USER_ID, character.householdId, character.id, {
      emotional: 0.5, social: 0.3, cultural: 0.1,
    });

    expect(result.version).toBe(2);
    expect(result.influence.emotional).toBe(0.5);

    const domainRepo = getDomainRepo(db! as never);
    const events = await domainRepo.getDomainEvents(character.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("CHARACTER_INFLUENCE_UPDATED");
    expect(events[0]?.aggregateVersion).toBe(2);
  });

  itIfDb("addRelationship produces CHARACTER_RELATIONSHIP_ADDED event with version=2", async () => {
    const { character, household, db: d } = await setupCharacter();
    const charRepo = new DrizzleCharacterRepository(d as never);
    const childRepo = new DrizzleChildProfileRepository(d as never);

    // addRelationship requires an NPC (child_avatar cannot manage relationships)
    // and the target character must exist (FK constraint). To avoid the
    // active-per-profile unique index we use a fresh child profile within the same household.
    const npcProfile = await childRepo.create({
      id: crypto.randomUUID(),
      householdId: household.id,
      displayName: "NPC Source Profile",
      ageBand: "6-8",
    });
    const targetProfile = await childRepo.create({
      id: crypto.randomUUID(),
      householdId: household.id,
      displayName: "NPC Target Profile",
      ageBand: "6-8",
    });

    const npc = await charRepo.create({
      id: crypto.randomUUID(),
      childProfileId: npcProfile.id,
      householdId: character.householdId,
      name: "Source NPC",
      broadKind: "human",
      characterType: "helper",
      subtype: "merchant",
      originMode: "auto",
      firstOriginPackageId: crypto.randomUUID(),
      originConcept: "Source NPC for relationship",
      startingRegionArchetype: "town",
      startingLocation: "shop",
      homeArchetype: "shop",
      nearbyNpcSeed: "neighbor",
      firstMysterySeed: "package",
      universeSeed: "npc-seed",
      safetyBounds: { ageBand: "6-8", contentBoundary: "moderate", requireParentApprovalForAi: false },
      characterSubtype: "npc",
      lifecycleStage: "adulthood",
      version: 1,
    });
    const target = await charRepo.create({
      id: crypto.randomUUID(),
      childProfileId: targetProfile.id,
      householdId: character.householdId,
      name: "Target NPC",
      broadKind: "human",
      characterType: "explorer",
      subtype: "wanderer",
      originMode: "auto",
      firstOriginPackageId: crypto.randomUUID(),
      originConcept: "Target NPC for relationship",
      startingRegionArchetype: "road",
      startingLocation: "crossroads",
      homeArchetype: "camp",
      nearbyNpcSeed: "merchant",
      firstMysterySeed: "letter",
      universeSeed: "target-seed",
      safetyBounds: { ageBand: "6-8", contentBoundary: "moderate", requireParentApprovalForAi: false },
      characterSubtype: "npc",
      lifecycleStage: "adulthood",
      version: 1,
    });

    const result = await addRelationship(TEST_USER_ID, character.householdId, npc.id, {
      targetCharacterId: target.id,
      trust: 0.6, affinity: 0.5, familiarity: 0.3, relationshipType: "friend",
    });

    expect(result.version).toBe(2);
    expect(result.relationships).toHaveLength(1);

    const domainRepo = getDomainRepo(db! as never);
    const events = await domainRepo.getDomainEvents(npc.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("CHARACTER_RELATIONSHIP_ADDED");
    expect(events[0]?.aggregateVersion).toBe(2);
  });

  itIfDb("updateLocation produces CHARACTER_LOCATION_CHANGED event with version=2", async () => {
    const { character } = await setupCharacter();

    const result = await updateLocation(TEST_USER_ID, character.householdId, character.id, crypto.randomUUID(), "forest");

    expect(result.version).toBe(2);
    expect(result.activeLocationType).toBe("forest");

    const domainRepo = getDomainRepo(db! as never);
    const events = await domainRepo.getDomainEvents(character.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("CHARACTER_LOCATION_CHANGED");
    expect(events[0]?.aggregateVersion).toBe(2);
  });

  itIfDb("all mutations record immutable event rows with correct version", async () => {
    const { character } = await setupCharacter();

    await applyTraitDeltas(TEST_USER_ID, character.householdId, character.id, [
      { dimension: "courage", oldValue: 0.5, newValue: 0.55, evidence: "e1", deltaMagnitude: 0.05 },
    ]);
    await updateEmotions(TEST_USER_ID, character.householdId, character.id, {
      joy: 0.7, sadness: 0.1, fear: 0.2, anger: 0.1, surprise: 0.3, trust: 0.5,
    });
    await updateNeeds(TEST_USER_ID, character.householdId, character.id, [
      { needType: "hunger", value: 0.5, decay: 0.05 },
    ]);

    const domainRepo = getDomainRepo(db! as never);
    const events = await domainRepo.getDomainEvents(character.id);
    expect(events).toHaveLength(3);
    expect(events[0]?.aggregateVersion).toBe(2);
    expect(events[1]?.aggregateVersion).toBe(3);
    expect(events[2]?.aggregateVersion).toBe(4);

    const charRepo = new DrizzleCharacterRepository(db! as never);
    const dbRecord = await charRepo.findById(character.id, character.householdId);
    expect(dbRecord?.version).toBe(4);
  });
});

describe("S06 - Trait Delta Bounded: Server-Authoritative oldValue (DB-gated)", () => {
  beforeEach(() => {
    __setTestDb(db as never);
  });
  afterEach(() => {
    __setTestDb(undefined);
  });

  itIfDb("rejects forged oldValue (current 0.5, payload oldValue=0.85,newValue=1.0) with TRAIT_OLD_VALUE_MISMATCH", async () => {
    const { character } = await setupCharacter();

    // Seed the actual trait state in DB to 0.5 (matches child_avatar default)
    const domainRepo = getDomainRepo(db! as never);
    await domainRepo.upsertTraitState({ characterId: character.id, dimension: "courage", value: 0.5 });

    const charRepo = new DrizzleCharacterRepository(db! as never);
    const versionBefore = (await charRepo.findById(character.id, character.householdId))?.version;
    expect(versionBefore).toBe(1);

    try {
      await applyTraitDeltas(TEST_USER_ID, character.householdId, character.id, [
        { dimension: "courage", oldValue: 0.85, newValue: 1.0, evidence: "forged" },
      ]);
      throw new Error("expected applyTraitDeltas to throw");
    } catch (err) {
      expect((err as Error & { code?: string }).code).toBe("TRAIT_OLD_VALUE_MISMATCH");
    }

    // Rejected mutation must NOT have changed DB state at all
    const traitsAfter = await domainRepo.getTraitStates(character.id);
    const courageAfter = traitsAfter.find((t) => t.dimension === "courage");
    expect(courageAfter?.value).toBe(0.5);

    const historyAfter = await domainRepo.getTraitHistory(character.id);
    expect(historyAfter).toHaveLength(0);

    const eventsAfter = await domainRepo.getDomainEvents(character.id);
    expect(eventsAfter).toHaveLength(0);

    const charAfter = await charRepo.findById(character.id, character.householdId);
    expect(charAfter?.version).toBe(1);
  });

  itIfDb("rejects forged oldValue in multi-delta batch (atomic - no partial mutation)", async () => {
    const { character } = await setupCharacter();

    const domainRepo = getDomainRepo(db! as never);
    await domainRepo.upsertTraitState({ characterId: character.id, dimension: "courage", value: 0.5 });
    await domainRepo.upsertTraitState({ characterId: character.id, dimension: "curiosity", value: 0.6 });

    const charRepo = new DrizzleCharacterRepository(db! as never);

    try {
      await applyTraitDeltas(TEST_USER_ID, character.householdId, character.id, [
        { dimension: "courage", oldValue: 0.5, newValue: 0.65, evidence: "valid" },
        { dimension: "curiosity", oldValue: 0.85, newValue: 1.0, evidence: "forged" },
      ]);
      throw new Error("expected applyTraitDeltas to throw");
    } catch (err) {
      expect((err as Error & { code?: string }).code).toBe("TRAIT_OLD_VALUE_MISMATCH");
    }

    // Neither trait must have been mutated
    const traits = await domainRepo.getTraitStates(character.id);
    const courage = traits.find((t) => t.dimension === "courage");
    const curiosity = traits.find((t) => t.dimension === "curiosity");
    expect(courage?.value).toBe(0.5);
    expect(curiosity?.value).toBe(0.6);

    const history = await domainRepo.getTraitHistory(character.id);
    expect(history).toHaveLength(0);

    const events = await domainRepo.getDomainEvents(character.id);
    expect(events).toHaveLength(0);

    const charAfter = await charRepo.findById(character.id, character.householdId);
    expect(charAfter?.version).toBe(1);
  });

  itIfDb("writes server-computed oldValue/newValue/deltaMagnitude to trait history (valid delta)", async () => {
    const { character } = await setupCharacter();

    const domainRepo = getDomainRepo(db! as never);
    await domainRepo.upsertTraitState({ characterId: character.id, dimension: "courage", value: 0.5 });

    // Payload intentionally sends wrong oldValue (0.85) — server must ignore and use actual 0.5
    const result = await applyTraitDeltas(
      TEST_USER_ID, character.householdId, character.id,
      [{ dimension: "courage", oldValue: 0.5, newValue: 0.65, evidence: "helped friend", deltaMagnitude: 0 }],
    );

    expect(result.version).toBe(2);
    expect(result.traits.courage).toBeCloseTo(0.65, 9);

    const history = await domainRepo.getTraitHistory(character.id);
    expect(history).toHaveLength(1);
    const h = history[0]!;
    expect(h.dimension).toBe("courage");
    expect(h.oldValue).toBeCloseTo(0.5, 9);
    expect(h.newValue).toBeCloseTo(0.65, 9);
    expect(h.deltaMagnitude).toBeCloseTo(0.15, 9);
    expect(h.evidence).toBe("helped friend");

    // Server-computed values must be reflected in the event payload too
    const events = await domainRepo.getDomainEvents(character.id);
    expect(events).toHaveLength(1);
    const payload = events[0]?.payload as { deltas?: { dimension: string; oldValue: number; newValue: number; deltaMagnitude: number }[] };
    expect(payload.deltas).toHaveLength(1);
    expect(payload.deltas?.[0]?.oldValue).toBeCloseTo(0.5, 9);
    expect(payload.deltas?.[0]?.newValue).toBeCloseTo(0.65, 9);
    expect(payload.deltas?.[0]?.deltaMagnitude).toBeCloseTo(0.15, 9);
  });

  itIfDb("multi-delta regression preserved: response.version === DB.version === event.aggregateVersion, 2 history rows, 1 event", async () => {
    const { character } = await setupCharacter();

    const domainRepo = getDomainRepo(db! as never);
    await domainRepo.upsertTraitState({ characterId: character.id, dimension: "courage", value: 0.5 });
    await domainRepo.upsertTraitState({ characterId: character.id, dimension: "curiosity", value: 0.6 });

    const result = await applyTraitDeltas(
      TEST_USER_ID, character.householdId, character.id,
      [
        { dimension: "courage", newValue: 0.65, evidence: "courage act" },
        { dimension: "curiosity", newValue: 0.75, evidence: "curious act" },
      ],
    );

    expect(result.version).toBe(2);

    const charRepo = new DrizzleCharacterRepository(db! as never);
    const dbRecord = await charRepo.findById(character.id, character.householdId);
    expect(dbRecord?.version).toBe(2);

    const events = await domainRepo.getDomainEvents(character.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("CHARACTER_TRAIT_CHANGED");
    expect(events[0]?.aggregateVersion).toBe(2);

    const history = await domainRepo.getTraitHistory(character.id);
    expect(history).toHaveLength(2);
    // Server-computed deltas: oldValue and deltaMagnitude must reflect actual current state
    const courageRow = history.find((h) => h.dimension === "courage")!;
    const curiosityRow = history.find((h) => h.dimension === "curiosity")!;
    expect(courageRow.oldValue).toBeCloseTo(0.5, 9);
    expect(courageRow.newValue).toBeCloseTo(0.65, 9);
    expect(courageRow.deltaMagnitude).toBeCloseTo(0.15, 9);
    expect(curiosityRow.oldValue).toBeCloseTo(0.6, 9);
    expect(curiosityRow.newValue).toBeCloseTo(0.75, 9);
    expect(curiosityRow.deltaMagnitude).toBeCloseTo(0.15, 9);
  });

  itIfDb("rejects duplicate trait dimension in same batch with DUPLICATE_TRAIT_DELTA_DIMENSION", async () => {
    const { character } = await setupCharacter();

    const domainRepo = getDomainRepo(db! as never);
    await domainRepo.upsertTraitState({ characterId: character.id, dimension: "courage", value: 0.5 });
    await domainRepo.upsertTraitState({ characterId: character.id, dimension: "curiosity", value: 0.6 });

    const charRepo = new DrizzleCharacterRepository(db! as never);

    try {
      await applyTraitDeltas(TEST_USER_ID, character.householdId, character.id, [
        { dimension: "courage", newValue: 0.55, evidence: "first courage" },
        { dimension: "curiosity", newValue: 0.65, evidence: "valid curiosity" },
        { dimension: "courage", newValue: 0.60, evidence: "duplicate courage" },
      ]);
      throw new Error("expected applyTraitDeltas to throw");
    } catch (err) {
      expect((err as Error & { code?: string }).code).toBe("DUPLICATE_TRAIT_DELTA_DIMENSION");
    }

    // Rejected mutation must NOT have changed DB state at all
    const traits = await domainRepo.getTraitStates(character.id);
    const courage = traits.find((t) => t.dimension === "courage");
    const curiosity = traits.find((t) => t.dimension === "curiosity");
    expect(courage?.value).toBe(0.5);
    expect(curiosity?.value).toBe(0.6);

    const history = await domainRepo.getTraitHistory(character.id);
    expect(history).toHaveLength(0);

    const events = await domainRepo.getDomainEvents(character.id);
    expect(events).toHaveLength(0);

    const charAfter = await charRepo.findById(character.id, character.householdId);
    expect(charAfter?.version).toBe(1);
  });
});
