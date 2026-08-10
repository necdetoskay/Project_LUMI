import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { MemoryAwareDecisionService } from "../../src/application";
import type {
  CandidateAction,
  CanonicalMemory,
  DecisionContextVector,
  UtilityWeightPolicy,
} from "../../src/domain";
import { createDatabase, DrizzleCanonicalMemoryRepository } from "../../src/db";

const DATABASE_URL = process.env.DATABASE_URL;
const enabled =
  process.env.ULTEF_SCENARIO === "PX-LUMI-S47-MEMORY-NPC-DECISION-001";
const destructive = process.env.NPC_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && DATABASE_URL ? describe : describe.skip;

let pool: pg.Pool;

function assertDisposable(url: string): void {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(`S47 requires a disposable DB; got '${name}'.`);
  }
}

function memory(input: {
  id: string;
  householdId: string;
  worldId: string;
  profileId: string;
  npcId: string;
  candidateId: string;
  affinity: number;
}): CanonicalMemory {
  return {
    id: input.id,
    householdId: input.householdId,
    worldId: input.worldId,
    childProfileId: input.profileId,
    ownerType: "npc",
    ownerId: input.npcId,
    kind: "experience",
    summary: "Structured decision evidence memory.",
    salience: 1,
    confidence: 1,
    sourceType: "story_outcome",
    sourceId: `s47:${input.id}`,
    effectKey: `s47:${input.id}`,
    provenance: [`decision:candidate:${input.candidateId}:${input.affinity}`],
    lifecycle: "durable",
    supersedesMemoryId: null,
    createdAt: new Date("2026-08-10T00:00:00.000Z"),
    lastReinforcedAt: null,
    expiresAt: null,
    archivedAt: null,
  };
}

const candidates: CandidateAction[] = [
  {
    id: "help_friend",
    kind: "comfort",
    description: "Help a nearby friend",
    requiredFactIds: [],
    targetCharacterId: null,
    needTypes: [],
    personalityFit: 1,
    safety: "safe",
  },
  {
    id: "walk_away",
    kind: "explore",
    description: "Walk away",
    requiredFactIds: [],
    targetCharacterId: null,
    needTypes: [],
    personalityFit: 1,
    safety: "safe",
  },
];

const contextBase = {
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
  contentHash: "s47-context",
} satisfies Omit<DecisionContextVector, "npcId" | "householdId">;

const policy: UtilityWeightPolicy = {
  version: "s47-zero-base",
  updatedAt: new Date("2026-08-10T00:00:00.000Z"),
  weights: {
    needSatisfaction: 0,
    emotionalComfort: 0,
    safety: 0,
    goalAlignment: 0,
    relationshipImpact: 0,
    socialApproval: 0,
    curiosity: 0,
    personalityFit: 0,
    timeSensitivity: 0,
    resourceCost: 0,
    timeCost: 0,
  },
};

beforeAll(async () => {
  if (!enabled || !destructive || !DATABASE_URL) return;
  assertDisposable(DATABASE_URL);
  pool = new pg.Pool({ connectionString: DATABASE_URL });
});

afterAll(async () => {
  if (pool) await pool.end();
});

ultefDescribe("ULTEF PX-LUMI-S47-MEMORY-NPC-DECISION-001", () => {
  it("uses only exact-scope canonical memory and replays deterministically", async () => {
    const householdId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const otherProfileId = crypto.randomUUID();
    const npcId = crypto.randomUUID();
    const db = createDatabase(DATABASE_URL!);
    const memories = new DrizzleCanonicalMemoryRepository(db);
    const service = new MemoryAwareDecisionService(memories);
    const now = new Date("2026-08-10T02:00:00.000Z");

    try {
      await memories.save(
        memory({
          id: crypto.randomUUID(),
          householdId,
          worldId,
          profileId,
          npcId,
          candidateId: "help_friend",
          affinity: 1,
        }),
      );
      await memories.save(
        memory({
          id: crypto.randomUUID(),
          householdId,
          worldId,
          profileId: otherProfileId,
          npcId,
          candidateId: "walk_away",
          affinity: 1,
        }),
      );

      const input = {
        householdId,
        worldId,
        childProfileId: profileId,
        npcId,
        candidates,
        context: { ...contextBase, householdId, npcId },
        policy,
        seed: "s47-replay-seed",
        now,
      };

      const first = await service.decide(input);
      const replay = await service.decide(input);

      expect(first.selection.selectedCandidateId).toBe("help_friend");
      expect(first.usedMemoryIds).toHaveLength(1);
      expect(
        first.scores.find((score) => score.candidateId === "help_friend"),
      ).toEqual(expect.objectContaining({ memoryDelta: 0.2, total: 0.2 }));
      expect(
        first.scores.find((score) => score.candidateId === "walk_away"),
      ).toEqual(expect.objectContaining({ memoryDelta: 0, total: 0 }));
      expect(replay).toEqual(first);

      const scopedRows = await pool.query<{ child_profile_id: string }>(
        "SELECT child_profile_id FROM npc_intelligence.memories WHERE household_id = $1 AND world_id = $2 AND owner_id = $3 ORDER BY child_profile_id",
        [householdId, worldId, npcId],
      );
      expect(scopedRows.rows).toHaveLength(2);
    } finally {
      await pool.query(
        "DELETE FROM npc_intelligence.memories WHERE household_id = $1",
        [householdId],
      );
    }
  });
});
