import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { getStoryDb } from "../../src/application/db";
import { persistGeneratedSceneAndAdvance } from "../../src/application/generated-scene-session.service";
import { DrizzleStoryRepository } from "../../src/db/repositories/drizzle/drizzle-story.repository";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";
import { cleanupStoryFixture, seedStoryFixture } from "./ultef-fixtures";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const enabled = process.env.ULTEF_SCENARIO === "L4-SCENE-SESSION-001";
const describeDb = hasDatabase && enabled ? describe : describe.skip;

const ids = {
  householdId: crypto.randomUUID(),
  childProfileId: crypto.randomUUID(),
  characterId: crypto.randomUUID(),
  worldId: crypto.randomUUID(),
  storyDefinitionId: crypto.randomUUID(),
  storyVersionId: crypto.randomUUID(),
  entrySceneId: crypto.randomUUID(),
  storySessionId: crypto.randomUUID(),
};

const db = hasDatabase ? getStoryDb() : null;
const repo = new DrizzleStoryRepository();
let pool: pg.Pool | null = null;

describeDb("L4-SCENE-SESSION-001 generated scene -> session -> reader", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await seedStoryFixture(pool, ids);
  });

  afterAll(async () => {
    if (!pool) return;
    await cleanupStoryFixture(pool, ids);
    await pool.end();
  });

  it("materializes generated prose, advances the canonical session and reloads the same prose from persisted reader state", async () => {
    if (!db) throw new Error("DATABASE_URL_REQUIRED");

    const scenario = createScenario({
      id: "L4-SCENE-SESSION-001",
      title:
        "Generated scene persists and becomes reader-visible session state",
      level: "L4",
      projectGate: "PX-LUMI-05",
      seed: "scene-session-001",
    });
    scenario.setup("Child", {
      id: ids.childProfileId,
      name: "Deniz",
      ageBand: "6-8",
    });
    scenario.setup("Character", { id: ids.characterId, name: "Arin" });
    scenario.setup("NPC", { name: "Mira" });
    scenario.setup("World", { id: ids.worldId, name: "Gunes Vadisi" });
    scenario.event(
      "story.session.started",
      "Deniz icin Arin'in Gunes Vadisi hikaye oturumu gercek household/profile/world foreign-key zinciriyle baslatildi.",
    );

    await repo.createSceneVisit(db, {
      id: crypto.randomUUID(),
      storySessionId: ids.storySessionId,
      sceneId: ids.entrySceneId,
      visitSequence: 0,
      visitReason: "session_start",
      enteredAt: new Date(),
    });

    const generated = {
      sceneId: "llm-rumor-scene-001",
      setting: "Gunes Vadisi eski kutuphanesinin sicak okuma kosesi",
      characters: ["Arin", "Mira"],
      narrative:
        "Mira, Arin'e eski koprunun isiklarinin firtinadan once yandigina dair duydugu soylentiyi anlatti. Arin bunun ilk kim tarafindan goruldugunu merak etti.",
      moment: "Arin soylentinin kaynagini sormaya karar verdi.",
      nextPrompt: "Bunu ilk kim gordu?",
    };
    scenario.event(
      "story.scene.generated",
      `Generated scene: ${generated.narrative}`,
    );

    const result = await persistGeneratedSceneAndAdvance({
      sessionId: ids.storySessionId,
      expectedVersion: 1,
      scene: generated,
      modelId: "ultef-deterministic-provider",
      sourceHookId: "rumor-hook-001",
      idempotencyKey: `ultef-generated-scene:${ids.storySessionId}`,
    });
    scenario.event(
      "story.session.advanced",
      `Session generated sahneye ilerledi; version 1 -> ${result.playbackState.session.version}.`,
    );

    const reloaded = await repo.findSessionById(db, ids.storySessionId);
    const persistedScene = await repo.findSceneById(
      db,
      result.generatedSceneId,
    );
    const visits = await repo.findSceneVisitsBySession(db, ids.storySessionId);
    const checkpoint = await repo.findLatestCheckpoint(db, ids.storySessionId);
    scenario.event(
      "story.reader.reloaded",
      "Session, generated scene, visit ve checkpoint PostgreSQL'den yeniden okundu.",
    );

    const assertions = {
      persistedOnce: result.reusedPersistedScene === false,
      playbackVersionAdvanced: result.playbackState.session.version === 2,
      readerPointsToGenerated:
        reloaded?.currentSceneId === result.generatedSceneId,
      narrativeReloaded: persistedScene?.narrativeText === generated.narrative,
      visitPersisted: visits.at(-1)?.sceneId === result.generatedSceneId,
      checkpointPersisted: checkpoint?.sceneId === result.generatedSceneId,
    };

    scenario.assert(
      "Generated scene persisted once",
      assertions.persistedOnce,
      false,
      result.reusedPersistedScene,
    );
    scenario.assert(
      "Session version advanced",
      assertions.playbackVersionAdvanced,
      2,
      result.playbackState.session.version,
    );
    scenario.assert(
      "Reader points to generated scene",
      assertions.readerPointsToGenerated,
      result.generatedSceneId,
      reloaded?.currentSceneId ?? null,
    );
    scenario.assert(
      "Narrative survives DB reload",
      assertions.narrativeReloaded,
      generated.narrative,
      persistedScene?.narrativeText ?? null,
    );
    scenario.assert(
      "Scene visit persisted",
      assertions.visitPersisted,
      result.generatedSceneId,
      visits.at(-1)?.sceneId ?? null,
    );
    scenario.assert(
      "Checkpoint persisted",
      assertions.checkpointPersisted,
      result.generatedSceneId,
      checkpoint?.sceneId ?? null,
    );
    scenario.delta(
      "story.session.version",
      1,
      reloaded?.version ?? null,
      "generated scene advancement",
    );
    scenario.delta(
      "story.session.currentSceneId",
      ids.entrySceneId,
      reloaded?.currentSceneId ?? null,
      "reader-visible generated scene",
    );

    const passed = Object.values(assertions).every(Boolean);
    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "Generated story prose was persisted, advanced through the canonical session path, and remained identical after DB reload in reader state."
        : "Generated scene/session persistence did not satisfy all runtime assertions.",
    });
    await writeScenarioArtifacts(report, { environment: "integration" });
    expect(report.result).toBe("PASS");
  });
});
