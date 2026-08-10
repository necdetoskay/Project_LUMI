import { afterAll, describe, expect, it } from "vitest";
import { createDatabase, DrizzleNpcSnapshotRepository } from "@lumi/npc-intelligence/db";
import { RepositoryNpcSourceAdapter } from "../src/adapters";

const enabled = process.env.ULTEF_SCENARIO === "PX-LUMI-S48-NPC-SNAPSHOT-WORKER-001";
const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!enabled || !databaseUrl)("S48 canonical NPC snapshot worker wiring", () => {
  const db = createDatabase(databaseUrl!);
  const repo = new DrizzleNpcSnapshotRepository(db);
  const adapter = new RepositoryNpcSourceAdapter(repo, 8);

  const householdA = crypto.randomUUID();
  const householdB = crypto.randomUUID();
  const worldId = crypto.randomUUID();
  const profileA = crypto.randomUUID();
  const profileB = crypto.randomUUID();
  const characterId = crypto.randomUUID();
  const npcA = crypto.randomUUID();
  const npcB = crypto.randomUUID();
  const now = new Date("2026-08-10T03:30:00.000Z");

  afterAll(async () => {
    // Disposable CI database owns cleanup.
  });

  it("returns only exact household/world snapshots in deterministic order", async () => {
    await repo.upsert({
      npcId: npcA,
      householdId: householdA,
      worldId,
      childProfileId: profileA,
      characterId,
      locationId: null,
      needTypes: ["belonging"],
      relationshipToCharacter: 0.4,
      lastInteractionAt: now,
      updatedAt: now,
    });
    await repo.upsert({
      npcId: npcB,
      householdId: householdB,
      worldId,
      childProfileId: profileB,
      characterId,
      locationId: null,
      needTypes: ["rest"],
      relationshipToCharacter: -0.1,
      lastInteractionAt: now,
      updatedAt: now,
    });

    const snapshots = await adapter.fetchSnapshots(worldId, householdA);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.npcId).toBe(npcA);
    expect(snapshots[0]?.householdId).toBe(householdA);
  });

  it("updates an existing scoped NPC without creating replay duplicates", async () => {
    await repo.upsert({
      npcId: npcA,
      householdId: householdA,
      worldId,
      childProfileId: profileA,
      characterId,
      locationId: null,
      needTypes: ["rest", "belonging"],
      relationshipToCharacter: 0.6,
      lastInteractionAt: now,
      updatedAt: new Date(now.getTime() + 1000),
    });

    const snapshots = await adapter.fetchSnapshots(worldId, householdA);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.needTypes).toEqual(["rest", "belonging"]);
    expect(snapshots[0]?.relationshipToCharacter).toBe(0.6);
  });
});
