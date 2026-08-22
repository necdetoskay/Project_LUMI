import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createLogger } from "@lumi/logger";
import { MemoryAwareDecisionService } from "@lumi/npc-intelligence/application";
import {
  createDatabase,
  DrizzleCanonicalMemoryRepository,
  DrizzleNpcSnapshotRepository,
  DrizzleWorkerNpcDecisionRepository,
} from "@lumi/npc-intelligence/db";
import type { CanonicalMemory } from "@lumi/npc-intelligence/domain";
import type { CanonicalMemoryPort } from "@lumi/npc-intelligence/ports";
import { RepositoryNpcSourceAdapter } from "../src/adapters";
import { NpcDecisionJobRunner } from "../src/npc-decision-runner";
import { seedWorkerCanonicalNpcFixture } from "./helpers/canonical-npc-fixture";

const enabled =
  process.env.ULTEF_SCENARIO === "PX-LUMI-S48-NPC-SNAPSHOT-WORKER-001";
const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!enabled || !databaseUrl)(
  "S48 canonical NPC snapshot worker wiring",
  () => {
    const db = createDatabase(databaseUrl!);
    const repo = new DrizzleNpcSnapshotRepository(db);
    const memoryRepo = new DrizzleCanonicalMemoryRepository(db);
    let memoryReads = 0;
    const countingMemoryPort: CanonicalMemoryPort = {
      save: (memory) => memoryRepo.save(memory),
      listRelevant: async (query) => {
        memoryReads += 1;
        return memoryRepo.listRelevant(query);
      },
      reinforce: (input) => memoryRepo.reinforce(input),
      reinforceForScene: (input) => memoryRepo.reinforceForScene(input),
      archive: (input) => memoryRepo.archive(input),
    };
    const decisionLedger = new DrizzleWorkerNpcDecisionRepository(db);
    const adapter = new RepositoryNpcSourceAdapter(repo, 8);
    const logger = createLogger({ level: "error" });
    const decisionRunner = new NpcDecisionJobRunner(
      repo,
      new MemoryAwareDecisionService(countingMemoryPort),
      decisionLedger,
      logger,
      8,
    );

    const householdA = crypto.randomUUID();
    const householdB = crypto.randomUUID();
    const worldA = crypto.randomUUID();
    const worldB = crypto.randomUUID();
    const profileA = crypto.randomUUID();
    const profileB = crypto.randomUUID();
    const characterA = crypto.randomUUID();
    const characterB = crypto.randomUUID();
    const npcA = crypto.randomUUID();
    const npcB = crypto.randomUUID();
    const memoryId = crypto.randomUUID();
    const now = new Date("2026-08-10T03:30:00.000Z");
    let fixturePool: pg.Pool;

    beforeAll(async () => {
      fixturePool = new pg.Pool({ connectionString: databaseUrl! });
      await seedWorkerCanonicalNpcFixture(fixturePool, {
        householdId: householdA,
        childProfileId: profileA,
        characterId: characterA,
        worldId: worldA,
        fixtureKey: `s48-a-${householdA}`,
        npcs: [{ id: npcA, name: "S48 NPC A" }],
      });
      await seedWorkerCanonicalNpcFixture(fixturePool, {
        householdId: householdB,
        childProfileId: profileB,
        characterId: characterB,
        worldId: worldB,
        fixtureKey: `s48-b-${householdB}`,
        npcs: [{ id: npcB, name: "S48 NPC B" }],
      });
    });

    afterAll(async () => {
      await fixturePool.query(`DELETE FROM profile.households WHERE id = ANY($1::uuid[])`, [
        [householdA, householdB],
      ]);
      await fixturePool.end();
    });

    it("returns only exact household/world snapshots in deterministic order", async () => {
      await repo.upsert({
        npcId: npcA,
        householdId: householdA,
        worldId: worldA,
        childProfileId: profileA,
        characterId: characterA,
        locationId: null,
        needTypes: ["belonging"],
        relationshipToCharacter: 0.4,
        lastInteractionAt: now,
        updatedAt: now,
      });
      await repo.upsert({
        npcId: npcB,
        householdId: householdB,
        worldId: worldB,
        childProfileId: profileB,
        characterId: characterB,
        locationId: null,
        needTypes: ["rest"],
        relationshipToCharacter: -0.1,
        lastInteractionAt: now,
        updatedAt: now,
      });

      const snapshots = await adapter.fetchSnapshots(worldA, householdA);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]?.npcId).toBe(npcA);
      expect(snapshots[0]?.householdId).toBe(householdA);
    });

    it("updates an existing scoped NPC without creating replay duplicates", async () => {
      await repo.upsert({
        npcId: npcA,
        householdId: householdA,
        worldId: worldA,
        childProfileId: profileA,
        characterId: characterA,
        locationId: null,
        needTypes: ["rest", "belonging"],
        relationshipToCharacter: 0.6,
        lastInteractionAt: now,
        updatedAt: new Date(now.getTime() + 1000),
      });

      const snapshots = await adapter.fetchSnapshots(worldA, householdA);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]?.needTypes).toEqual(["rest", "belonging"]);
      expect(snapshots[0]?.relationshipToCharacter).toBe(0.6);
    });

    it("runs an exact-profile memory-aware decision once and short-circuits replay", async () => {
      const decisionKey = "s48-decision-1";
      await repo.upsert({
        npcId: npcA,
        householdId: householdA,
        worldId: worldA,
        childProfileId: profileA,
        characterId: characterA,
        locationId: null,
        needTypes: ["belonging"],
        relationshipToCharacter: 0.6,
        decisionPayload: {
          decisionKey,
          seed: "s48-seed",
          candidates: [
            {
              id: "join-1",
              kind: "socialize",
              description: "Join the nearby activity",
              requiredFactIds: [],
              targetCharacterId: null,
              needTypes: [],
              personalityFit: 0.5,
              safety: "safe",
            },
            {
              id: "rest-1",
              kind: "rest",
              description: "Rest quietly",
              requiredFactIds: [],
              targetCharacterId: null,
              needTypes: [],
              personalityFit: 0.5,
              safety: "safe",
            },
          ],
          context: {
            npcId: npcA,
            householdId: householdA,
            traits: {},
            emotions: {},
            influence: {
              emotional: 0,
              social: 0,
              cultural: 0,
              educational: 0,
              political: 0,
              environmental: 0,
              familial: 0,
              spiritual: 0,
              historical: 0,
            },
            relationships: [],
            needs: [],
            goals: [],
            timeSensitivity: 0,
            urgency: 0,
            contentHash: "s48-context",
          },
          policy: {
            version: "s48-policy",
            updatedAt: now,
            weights: {
              needSatisfaction: 0,
              emotionalComfort: 0,
              safety: 1,
              goalAlignment: 0,
              relationshipImpact: 0,
              socialApproval: 0,
              curiosity: 0,
              personalityFit: 0,
              timeSensitivity: 0,
              resourceCost: 0,
              timeCost: 0,
            },
          },
        },
        lastInteractionAt: now,
        updatedAt: new Date(now.getTime() + 2000),
      });

      await repo.upsert({
        npcId: npcA,
        householdId: householdA,
        worldId: worldA,
        childProfileId: profileA,
        characterId: characterA,
        locationId: null,
        needTypes: ["belonging", "rest"],
        relationshipToCharacter: 0.7,
        lastInteractionAt: now,
        updatedAt: new Date(now.getTime() + 3000),
      });
      const decisionReady = await repo.listDecisionReady(
        householdA,
        worldA,
        profileA,
        8,
      );
      expect(decisionReady).toHaveLength(1);
      expect(decisionReady[0]?.decisionPayload?.decisionKey).toBe(decisionKey);

      const memory: CanonicalMemory = {
        id: memoryId,
        householdId: householdA,
        worldId: worldA,
        childProfileId: profileA,
        ownerType: "npc",
        ownerId: npcA,
        kind: "experience",
        summary: "Explicit decision evidence",
        salience: 1,
        confidence: 1,
        sourceType: "story_outcome",
        sourceId: "s48-source",
        effectKey: `s48:${memoryId}`,
        provenance: ["decision:candidate:join-1:1"],
        lifecycle: "durable",
        createdAt: now,
      };
      await memoryRepo.save(memory);

      const first = await decisionRunner.runForWorld({
        householdId: householdA,
        worldId: worldA,
        childProfileId: profileA,
        now,
      });
      expect(first).toEqual({ applied: 1, duplicates: 0, skippedNotReady: 0 });
      expect(memoryReads).toBe(1);

      const evidence = await decisionLedger.get(
        householdA,
        worldA,
        profileA,
        npcA,
        decisionKey,
      );
      expect(evidence).not.toBeNull();
      expect(evidence?.selectedCandidateId).toBe("join-1");
      expect(evidence?.usedMemoryIds).toEqual([memoryId]);

      const replay = await decisionRunner.runForWorld({
        householdId: householdA,
        worldId: worldA,
        childProfileId: profileA,
        now: new Date(now.getTime() + 5000),
      });
      expect(replay).toEqual({ applied: 0, duplicates: 1, skippedNotReady: 0 });
      expect(memoryReads).toBe(1);

      const replayEvidence = await decisionLedger.get(
        householdA,
        worldA,
        profileA,
        npcA,
        decisionKey,
      );
      expect(replayEvidence?.decidedAt.toISOString()).toBe(now.toISOString());

      const wrongProfile = await decisionRunner.runForWorld({
        householdId: householdA,
        worldId: worldA,
        childProfileId: profileB,
        now,
      });
      expect(wrongProfile.applied).toBe(0);
      expect(memoryReads).toBe(1);
      expect(
        await decisionLedger.get(
          householdA,
          worldA,
          profileB,
          npcA,
          decisionKey,
        ),
      ).toBeNull();
    });
  },
);
