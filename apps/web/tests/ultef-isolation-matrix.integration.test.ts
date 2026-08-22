import pg from "pg";
import { describe, expect, it } from "vitest";

import {
  BeliefService,
  RumorBeliefWriterService,
} from "@lumi/npc-intelligence/application";
import { DrizzleBeliefSourceRepository } from "@lumi/npc-intelligence/db";
import { createDatabase as createNpcDatabase } from "@lumi/npc-intelligence/db/client";
import {
  createChildProfile,
  createHousehold,
  findChildProfileForUser,
} from "@lumi/profiles/application";

import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { seedCanonicalNpcFixture } from "./helpers/canonical-npc-fixture";

const databaseUrl =
  process.env.STORY_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const enabled = process.env.ULTEF_SCENARIO === "L2-ISOLATION-MATRIX";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

ultefDescribe("ULTEF Sprint 01 — household isolation matrix", () => {
  it("L2-ISOLATION-001 rejects cross-household profile access without changing protected state", async () => {
    const scenario = createScenario({
      id: "L2-ISOLATION-001",
      title: "Foreign household cannot load child profile",
      level: "L2",
      projectGate: "PX-LUMI-06",
      seed: "runtime-uuid",
    });

    const ownerA = crypto.randomUUID();
    const ownerB = crypto.randomUUID();
    const suffixA = crypto.randomUUID().slice(0, 8);
    const suffixB = crypto.randomUUID().slice(0, 8);

    const householdA = await createHousehold(ownerA, {
      name: `ULTEF Household A ${suffixA}`,
      slug: `ultef-a-${suffixA}`,
    });
    const householdB = await createHousehold(ownerB, {
      name: `ULTEF Household B ${suffixB}`,
      slug: `ultef-b-${suffixB}`,
    });
    const childA = await createChildProfile(ownerA, {
      householdId: householdA.id,
      displayName: "Deniz-A",
      ageBand: "6-8",
    });

    scenario.setup("Protected household", {
      id: householdA.id,
      alias: "Household A",
    });
    scenario.setup("Foreign household", {
      id: householdB.id,
      alias: "Household B",
    });
    scenario.setup("Protected child", {
      id: childA.id,
      name: childA.displayName,
    });

    const before = await findChildProfileForUser(
      childA.id,
      ownerA,
      householdA.id,
    );

    let foreignResult = null;
    let rejection = "scoped lookup returned no record";
    try {
      foreignResult = await findChildProfileForUser(
        childA.id,
        ownerB,
        householdB.id,
      );
    } catch (error) {
      rejection = error instanceof Error ? error.message : String(error);
    }
    const rejected = foreignResult === null;

    const after = await findChildProfileForUser(
      childA.id,
      ownerA,
      householdA.id,
    );

    scenario.event(
      "cross-household.profile.read",
      rejected
        ? `Household B attempted to read Deniz-A and received no protected record: ${rejection}`
        : "Household B unexpectedly received Deniz-A.",
      { rejected, foreignProfileId: foreignResult?.id ?? null },
    );
    scenario.event(
      "protected-state.reload",
      "Household A reloaded Deniz-A after the foreign access attempt.",
    );
    scenario.assert(
      "Foreign household cannot obtain the protected child profile",
      rejected,
      true,
      rejected,
    );
    scenario.assert(
      "Protected child remains owned by Household A",
      after?.householdId === householdA.id,
      householdA.id,
      after?.householdId ?? null,
    );
    scenario.assert(
      "Protected profile identity is unchanged",
      before?.id === after?.id && after?.id === childA.id,
      childA.id,
      after?.id ?? null,
    );
    scenario.delta(
      "HouseholdA.childProfile.householdId",
      before?.householdId ?? null,
      after?.householdId ?? null,
      "foreign access must not mutate ownership",
    );

    const passed =
      rejected &&
      after?.householdId === householdA.id &&
      after?.id === childA.id;
    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "Foreign household profile lookup returned no protected record and protected state remained unchanged."
        : "Household profile isolation assertions failed.",
    });
    await writeScenarioArtifacts(report, { environment: "integration" });
    expect(report.result).toBe("PASS");
  });

  it("L2-ISOLATION-003 keeps persisted NPC belief state inside its household scope", async () => {
    if (!databaseUrl) throw new Error("Database URL is required");

    const scenario = createScenario({
      id: "L2-ISOLATION-003",
      title: "NPC belief state never crosses household boundary",
      level: "L2",
      projectGate: "PX-LUMI-03",
      seed: "runtime-uuid",
    });

    const ownerA = crypto.randomUUID();
    const ownerB = crypto.randomUUID();
    const suffixA = crypto.randomUUID().slice(0, 8);
    const suffixB = crypto.randomUUID().slice(0, 8);
    const householdA = await createHousehold(ownerA, {
      name: `ULTEF NPC Household A ${suffixA}`,
      slug: `ultef-npc-a-${suffixA}`,
    });
    const householdB = await createHousehold(ownerB, {
      name: `ULTEF NPC Household B ${suffixB}`,
      slug: `ultef-npc-b-${suffixB}`,
    });

    const npcDb = createNpcDatabase(databaseUrl);
    const repository = new DrizzleBeliefSourceRepository(npcDb);
    const writer = new RumorBeliefWriterService(new BeliefService(repository));
    const childProfileId = crypto.randomUUID();
    const childAvatarId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const sourceNpcId = crypto.randomUUID();
    const targetNpcId = crypto.randomUUID();
    const factId = `ultef-isolation-${crypto.randomUUID()}`;

    const fixturePool = new pg.Pool({ connectionString: databaseUrl });
    try {
      await seedCanonicalNpcFixture(fixturePool, {
        householdId: householdA.id,
        childProfileId,
        characterId: childAvatarId,
        worldId,
        fixtureKey: `isolation-${householdA.id}`,
        npcs: [
          { id: sourceNpcId, name: "Mira" },
          { id: targetNpcId, name: "Bora" },
        ],
      });
    } finally {
      await fixturePool.end();
    }

    await writer.writeHearsay({
      householdId: householdA.id,
      sourceNpcId,
      targetNpcId,
      factId,
      claim: "Eski kulede geceleri kucuk bir isik goruluyor.",
      confidence: 0.72,
      provenance: [sourceNpcId],
      hops: 1,
    });

    const beliefsA = await repository.getBeliefs(targetNpcId, householdA.id);
    const beliefsB = await repository.getBeliefs(targetNpcId, householdB.id);
    const persistedA = beliefsA.find((belief) => belief.factId === factId);
    const leakedB = beliefsB.find((belief) => belief.factId === factId);

    scenario.setup("Source household", {
      id: householdA.id,
      alias: "Household A",
    });
    scenario.setup("Foreign household", {
      id: householdB.id,
      alias: "Household B",
    });
    scenario.setup("Target NPC", {
      id: targetNpcId,
      alias: "Bora",
      worldId,
      childProfileId,
    });
    scenario.event(
      "belief.persisted",
      "Bora learned one hearsay fact inside Household A.",
      { factId, confidence: persistedA?.confidence ?? null },
    );
    scenario.event(
      "cross-household.belief.read",
      leakedB
        ? "Household B unexpectedly observed Household A's belief."
        : "Household B queried the same NPC/fact identity but no foreign belief was visible.",
    );
    scenario.assert(
      "Household A can reload its persisted belief",
      Boolean(persistedA),
      true,
      Boolean(persistedA),
    );
    scenario.assert(
      "Household B cannot observe Household A belief",
      !leakedB,
      true,
      !leakedB,
    );
    scenario.delta(
      "HouseholdB.visibleBeliefCountForFact",
      0,
      leakedB ? 1 : 0,
      "foreign household must remain isolated",
    );

    const passed = Boolean(persistedA) && !leakedB;
    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "NPC belief persistence remained household-scoped after DB reload."
        : "NPC belief isolation assertions failed.",
    });
    await writeScenarioArtifacts(report, { environment: "integration" });
    expect(report.result).toBe("PASS");
  });
});
