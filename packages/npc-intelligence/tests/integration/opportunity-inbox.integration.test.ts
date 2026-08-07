import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { createDatabase } from "../../src/db/client";
import { DrizzleOpportunityInboxRepository } from "../../src/db/repositories/drizzle/drizzle-opportunity-inbox.repository";
import { InteractionOpportunity } from "../../src/domain/opportunity";
import { OpportunityDeliveryService } from "../../src/application/opportunity-delivery.service";

const enabled = process.env.NPC_TEST_ENABLE_DESTRUCTIVE === "true";
const dbUrl =
  process.env.DATABASE_URL ??
  "postgresql://lumi:lumi_local_only@localhost:15432/lumi";

const HOUSEHOLD = "20000000-0000-4000-8000-000000000020";
const NPC = "30000000-0000-4000-8000-000000000030";
const CHILD = "40000000-0000-4000-8000-000000000040";

function makeOpportunity(expiresAt: Date) {
  return InteractionOpportunity.create({
    householdId: HOUSEHOLD,
    sourceNpcId: NPC,
    childProfileId: CHILD,
    opportunityType: "rumor",
    message: "The bridge by the mill is damaged.",
    evidence: { claim: "bridge damaged" },
    score: 0.8,
    cooldownKeys: ["npc:child:rumor"],
    expiresAt,
    reason: "rumor test",
  });
}

describe("DrizzleOpportunityInboxRepository integration", () => {
  let pool: pg.Pool | undefined;
  let db: ReturnType<typeof createDatabase>;
  let repo: DrizzleOpportunityInboxRepository;
  let service: OpportunityDeliveryService;
  let connected = false;

  beforeAll(async () => {
    if (!enabled) return;

    pool = new pg.Pool({ connectionString: dbUrl });
    try {
      await pool.query("SELECT 1");
      connected = true;
    } catch {
      return;
    }

    await pool.query("DROP SCHEMA IF EXISTS npc_intelligence CASCADE");

    const migrationDir = path.resolve(
      import.meta.dirname,
      "..",
      "..",
      "migrations",
    );
    const files = readdirSync(migrationDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const sql = readFileSync(path.resolve(migrationDir, file), "utf-8");
      await pool.query(sql);
    }

    db = createDatabase(dbUrl);
    repo = new DrizzleOpportunityInboxRepository(db);
    service = new OpportunityDeliveryService(repo);
  });

  afterAll(async () => {
    if (pool) {
      await pool
        .query("DROP SCHEMA IF EXISTS npc_intelligence CASCADE")
        .catch(() => undefined);
      await pool.end();
    }
  });

  it("delivers, lists, and responds to an opportunity", async () => {
    if (!enabled || !connected) return;

    const o = makeOpportunity(new Date(Date.now() + 60_000));
    const result = await service.deliver({
      householdId: HOUSEHOLD,
      idempotencyKey: "npc:child:rumor",
      opportunity: o,
    });
    expect(result).toBe("delivered");

    const listed = await service.listProposedForChild(
      HOUSEHOLD,
      CHILD,
      new Date(),
    );
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(o.id);

    await service.respond(HOUSEHOLD, o.id, "accepted", new Date());

    const byId = await repo.findById(HOUSEHOLD, o.id);
    expect(byId).toBeDefined();
    expect(byId!.status).toBe("accepted");

    // Re-list: accepted is no longer proposed.
    const after = await service.listProposedForChild(
      HOUSEHOLD,
      CHILD,
      new Date(),
    );
    expect(after).toHaveLength(0);
  });

  it("enforces household isolation on findById", async () => {
    if (!enabled || !connected) return;

    const o = makeOpportunity(new Date(Date.now() + 60_000));
    await service.deliver({
      householdId: HOUSEHOLD,
      idempotencyKey: "npc:child:rumor-2",
      opportunity: o,
    });

    const other = await repo.findById(
      "99999999-0000-4000-8000-000000000001",
      o.id,
    );
    expect(other).toBeUndefined();
  });
});
