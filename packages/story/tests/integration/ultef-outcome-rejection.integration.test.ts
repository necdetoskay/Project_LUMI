import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";

import * as schema from "../../src/db/schema/story";
import type { Database } from "../../src/db/client";
import {
  EvidenceValidator,
  NarrativeEventExtractor,
  OutcomeManifest,
  StoryContextSnapshot,
  WorldCommitRuleEngine,
  defaultOutcomeRules,
} from "../../src/domain/outcome";
import {
  WorldCommitService,
  __setTestCommitDb,
} from "../../src/application/world-commit.service";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";
import { cleanupStoryFixture, seedStoryFixture } from "./ultef-fixtures";

const enabled = process.env.ULTEF_SCENARIO === "L4-OUTCOME-REJECTION";
const hasDatabase = Boolean(process.env.STORY_TEST_DATABASE_URL);
const describeDb = enabled && hasDatabase ? describe : describe.skip;

let queryClient: ReturnType<typeof postgres> | null = null;
let db: Database | null = null;
let pool: pg.Pool | null = null;

async function readProtectedState(
  database: Database,
  householdId: string,
  worldId: string,
  storySessionId: string,
  manifestId: string,
) {
  const commits = await database
    .select()
    .from(schema.storyCommitRecords)
    .where(eq(schema.storyCommitRecords.manifestId, manifestId));
  const worldVersions = await database
    .select()
    .from(schema.storyWorldVersions)
    .where(
      and(
        eq(schema.storyWorldVersions.householdId, householdId),
        eq(schema.storyWorldVersions.worldId, worldId),
      ),
    );
  const events = await database
    .select()
    .from(schema.storyEventStore)
    .where(eq(schema.storyEventStore.storySessionId, storySessionId));
  const outbox = await database
    .select()
    .from(schema.storyOutbox)
    .where(eq(schema.storyOutbox.householdId, householdId));

  return {
    commitCount: commits.length,
    worldVersionCount: worldVersions.length,
    eventCount: events.length,
    outboxCount: outbox.length,
  };
}

function commitDependencies() {
  return {
    extractor: new NarrativeEventExtractor(),
    validator: new EvidenceValidator(),
    ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
  };
}

describeDb("ULTEF Sprint 01 — invalid outcome rejection", () => {
  beforeAll(async () => {
    const url = process.env.STORY_TEST_DATABASE_URL;
    if (!url) return;
    queryClient = postgres(url, { max: 2 });
    db = drizzle(queryClient, { schema });
    pool = new pg.Pool({ connectionString: url });
    __setTestCommitDb(db);
  });

  afterAll(async () => {
    __setTestCommitDb(undefined);
    if (queryClient) await queryClient.end();
    if (pool) await pool.end();
  });

  it("L4-OUTCOME-REJECT-001 rejects an unknown target entity and persists no world side effect", async () => {
    if (!db || !pool) throw new Error("STORY_TEST_DATABASE_URL_REQUIRED");

    const fixture = {
      householdId: crypto.randomUUID(),
      childProfileId: crypto.randomUUID(),
      characterId: crypto.randomUUID(),
      worldId: crypto.randomUUID(),
      storyDefinitionId: crypto.randomUUID(),
      storyVersionId: crypto.randomUUID(),
      entrySceneId: crypto.randomUUID(),
      storySessionId: crypto.randomUUID(),
    };
    const knownNpcId = crypto.randomUUID();
    const unknownNpcId = crypto.randomUUID();
    await seedStoryFixture(pool, fixture);

    try {
      const manifest = OutcomeManifest.create({
        storySessionId: fixture.storySessionId,
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        source: "story_session",
        sourceSceneId: "ultef-invalid-outcome-scene",
        changes: [
          {
            key: "invalid-unknown-npc-change",
            outcomeType: "npc_state_update",
            entityId: unknownNpcId,
            operation: "set",
            field: "need.hunger",
            value: 95,
            evidenceRef: "scene://ultef/invalid-outcome#1",
          },
        ],
      });
      const snapshot = StoryContextSnapshot.create({
        storySessionId: fixture.storySessionId,
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        worldStateHash: "ultef-invalid-before",
        entities: [
          {
            entityId: knownNpcId,
            entityKind: "npc",
            state: { need: { hunger: 40 } },
            stateHash: "ultef-known-npc-before",
          },
        ],
      });

      const scenario = createScenario({
        id: "L4-OUTCOME-REJECT-001",
        title: "Invalid story outcome is rejected without world-state leakage",
        level: "L4",
        projectGate: "PX-LUMI-09",
        seed: "runtime-uuid",
      });
      scenario.setup("Child", { id: fixture.childProfileId, name: "Deniz" });
      scenario.setup("World", {
        id: fixture.worldId,
        name: "Gunes Vadisi",
      });
      scenario.setup("Known NPC in snapshot", {
        id: knownNpcId,
        name: "Mira",
      });
      scenario.setup("Invalid outcome target", {
        id: unknownNpcId,
        reason: "NPC is absent from pre-story snapshot",
      });

      const before = await readProtectedState(
        db,
        fixture.householdId,
        fixture.worldId,
        fixture.storySessionId,
        manifest.id,
      );

      let rejected = false;
      let rejection = "";
      try {
        await new WorldCommitService().commitManifest({
          manifest,
          snapshot,
          ...commitDependencies(),
        });
      } catch (error) {
        rejected = true;
        rejection = error instanceof Error ? error.message : String(error);
      }

      const after = await readProtectedState(
        db,
        fixture.householdId,
        fixture.worldId,
        fixture.storySessionId,
        manifest.id,
      );

      scenario.event(
        "story.outcome.invalid.proposed",
        `Hikaye, snapshot'ta bulunmayan bir NPC icin state degisikligi onerdi: ${unknownNpcId}.`,
      );
      scenario.event(
        "story.outcome.invalid.rejected",
        rejected
          ? `World commit reddedildi: ${rejection}`
          : "Invalid outcome beklenmedik sekilde kabul edildi.",
      );
      scenario.event(
        "world.state.reload",
        "Reddetme sonrasinda commit, world-version, event ve outbox kayitlari PostgreSQL'den yeniden okundu.",
      );

      const assertions = {
        rejected,
        evidenceFailure: rejection.includes("EVIDENCE_VALIDATION_FAILED"),
        noCommit: after.commitCount === before.commitCount,
        noWorldVersion: after.worldVersionCount === before.worldVersionCount,
        noEvent: after.eventCount === before.eventCount,
        noOutbox: after.outboxCount === before.outboxCount,
      };

      scenario.assert(
        "Invalid outcome is rejected",
        assertions.rejected,
        true,
        rejected,
      );
      scenario.assert(
        "Rejection is an evidence-validation failure",
        assertions.evidenceFailure,
        true,
        rejection,
      );
      scenario.assert(
        "No commit record leaked",
        assertions.noCommit,
        before.commitCount,
        after.commitCount,
      );
      scenario.assert(
        "World version did not advance",
        assertions.noWorldVersion,
        before.worldVersionCount,
        after.worldVersionCount,
      );
      scenario.assert(
        "No world commit event leaked",
        assertions.noEvent,
        before.eventCount,
        after.eventCount,
      );
      scenario.assert(
        "No indirect outbox intent leaked",
        assertions.noOutbox,
        before.outboxCount,
        after.outboxCount,
      );

      scenario.delta(
        "story.commit.count",
        before.commitCount,
        after.commitCount,
        "invalid outcome rejection",
      );
      scenario.delta(
        "story.worldVersion.count",
        before.worldVersionCount,
        after.worldVersionCount,
        "invalid outcome rejection",
      );
      scenario.delta(
        "story.outbox.count",
        before.outboxCount,
        after.outboxCount,
        "invalid outcome rejection",
      );

      const passed = Object.values(assertions).every(Boolean);
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "The invalid outcome was rejected before world commit and PostgreSQL reload proved no commit, world-version, event or outbox side effect was persisted."
          : "Outcome rejection or no-leak assertions failed.",
      });
      await writeScenarioArtifacts(report, { environment: "integration" });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(
        `DELETE FROM story.story_outbox WHERE household_id = $1`,
        [fixture.householdId],
      );
      await pool.query(
        `DELETE FROM story.story_commit_records WHERE household_id = $1`,
        [fixture.householdId],
      );
      await pool.query(
        `DELETE FROM story.story_world_versions WHERE household_id = $1`,
        [fixture.householdId],
      );
      await cleanupStoryFixture(pool, fixture);
    }
  });

  it("L4-OUTCOME-REJECT-002 rejects missing evidenceRef and persists no world side effect", async () => {
    if (!db || !pool) throw new Error("STORY_TEST_DATABASE_URL_REQUIRED");

    const fixture = {
      householdId: crypto.randomUUID(),
      childProfileId: crypto.randomUUID(),
      characterId: crypto.randomUUID(),
      worldId: crypto.randomUUID(),
      storyDefinitionId: crypto.randomUUID(),
      storyVersionId: crypto.randomUUID(),
      entrySceneId: crypto.randomUUID(),
      storySessionId: crypto.randomUUID(),
    };
    const npcId = crypto.randomUUID();
    await seedStoryFixture(pool, fixture);

    try {
      const manifest = OutcomeManifest.create({
        storySessionId: fixture.storySessionId,
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        source: "story_session",
        sourceSceneId: "ultef-missing-evidence-scene",
        changes: [
          {
            key: "missing-evidence-change",
            outcomeType: "npc_state_update",
            entityId: npcId,
            operation: "set",
            field: "need.hunger",
            value: 70,
            evidenceRef: "",
          },
        ],
      });
      const snapshot = StoryContextSnapshot.create({
        storySessionId: fixture.storySessionId,
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        worldStateHash: "ultef-missing-evidence-before",
        entities: [
          {
            entityId: npcId,
            entityKind: "npc",
            state: { need: { hunger: 40 } },
            stateHash: "ultef-missing-evidence-npc-before",
          },
        ],
      });

      const scenario = createScenario({
        id: "L4-OUTCOME-REJECT-002",
        title:
          "Outcome without evidence is rejected without world-state leakage",
        level: "L4",
        projectGate: "PX-LUMI-09",
        seed: "runtime-uuid",
      });
      scenario.setup("Child", { id: fixture.childProfileId, name: "Deniz" });
      scenario.setup("World", {
        id: fixture.worldId,
        name: "Gunes Vadisi",
      });
      scenario.setup("NPC", { id: npcId, name: "Mira" });
      scenario.setup("Invalid outcome", {
        field: "need.hunger",
        from: 40,
        to: 70,
        evidenceRef: "",
      });

      const before = await readProtectedState(
        db,
        fixture.householdId,
        fixture.worldId,
        fixture.storySessionId,
        manifest.id,
      );

      let rejected = false;
      let rejection = "";
      try {
        await new WorldCommitService().commitManifest({
          manifest,
          snapshot,
          ...commitDependencies(),
        });
      } catch (error) {
        rejected = true;
        rejection = error instanceof Error ? error.message : String(error);
      }

      const after = await readProtectedState(
        db,
        fixture.householdId,
        fixture.worldId,
        fixture.storySessionId,
        manifest.id,
      );

      scenario.event(
        "story.outcome.no-evidence.proposed",
        "Hikaye Mira'nin hunger state'ini degistirmeyi onerdi fakat change evidenceRef tasimiyordu.",
      );
      scenario.event(
        "story.outcome.no-evidence.rejected",
        rejected
          ? `World commit reddedildi: ${rejection}`
          : "Evidence'siz outcome beklenmedik sekilde kabul edildi.",
      );
      scenario.event(
        "world.state.reload",
        "Reddetme sonrasinda commit, world-version, event ve outbox kayitlari PostgreSQL'den yeniden okundu.",
      );

      const assertions = {
        rejected,
        evidenceFailure: rejection.includes("EVIDENCE_VALIDATION_FAILED"),
        missingEvidenceReason: rejection.includes("missing evidenceRef"),
        noCommit: after.commitCount === before.commitCount,
        noWorldVersion: after.worldVersionCount === before.worldVersionCount,
        noEvent: after.eventCount === before.eventCount,
        noOutbox: after.outboxCount === before.outboxCount,
      };

      scenario.assert(
        "Evidence-less outcome is rejected",
        assertions.rejected,
        true,
        rejected,
      );
      scenario.assert(
        "Rejection is an evidence-validation failure",
        assertions.evidenceFailure,
        true,
        rejection,
      );
      scenario.assert(
        "Rejection reports missing evidenceRef",
        assertions.missingEvidenceReason,
        true,
        rejection,
      );
      scenario.assert(
        "No commit record leaked",
        assertions.noCommit,
        before.commitCount,
        after.commitCount,
      );
      scenario.assert(
        "World version did not advance",
        assertions.noWorldVersion,
        before.worldVersionCount,
        after.worldVersionCount,
      );
      scenario.assert(
        "No world commit event leaked",
        assertions.noEvent,
        before.eventCount,
        after.eventCount,
      );
      scenario.assert(
        "No indirect outbox intent leaked",
        assertions.noOutbox,
        before.outboxCount,
        after.outboxCount,
      );

      const passed = Object.values(assertions).every(Boolean);
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "The evidence-less outcome was rejected before world commit and DB reload proved zero world-state leakage."
          : "Missing-evidence rejection or no-leak assertions failed.",
      });
      await writeScenarioArtifacts(report, { environment: "integration" });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(
        `DELETE FROM story.story_outbox WHERE household_id = $1`,
        [fixture.householdId],
      );
      await pool.query(
        `DELETE FROM story.story_commit_records WHERE household_id = $1`,
        [fixture.householdId],
      );
      await pool.query(
        `DELETE FROM story.story_world_versions WHERE household_id = $1`,
        [fixture.householdId],
      );
      await cleanupStoryFixture(pool, fixture);
    }
  });
});
