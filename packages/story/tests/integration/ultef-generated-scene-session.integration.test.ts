import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getStoryDb } from "../../src/application/db";
import { persistGeneratedSceneAndAdvance } from "../../src/application/generated-scene-session.service";
import { DrizzleStoryRepository } from "../../src/db/repositories/drizzle/drizzle-story.repository";
import {
  storyDefinitions,
  storyVersions,
  storyScenes,
  storySessions,
  storySessionSceneVisits,
  storySessionCheckpoints,
  storyEventStore,
  storyIdempotencyLedger,
} from "../../src/db/schema/story";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const enabled = process.env.ULTEF_SCENARIO === "L4-SCENE-SESSION-001";
const describeDb = hasDatabase && enabled ? describe : describe.skip;

const ids = {
  household: crypto.randomUUID(),
  child: crypto.randomUUID(),
  world: crypto.randomUUID(),
  definition: crypto.randomUUID(),
  version: crypto.randomUUID(),
  entryScene: crypto.randomUUID(),
  session: crypto.randomUUID(),
};

const db = hasDatabase ? getStoryDb() : null;
const repo = new DrizzleStoryRepository();

describeDb("L4-SCENE-SESSION-001 generated scene -> session -> reader", () => {
  afterAll(async () => {
    if (!db) return;
    await db.delete(storyIdempotencyLedger).where(eq(storyIdempotencyLedger.storySessionId, ids.session));
    await db.delete(storyEventStore).where(eq(storyEventStore.storySessionId, ids.session));
    await db.delete(storySessionCheckpoints).where(eq(storySessionCheckpoints.storySessionId, ids.session));
    await db.delete(storySessionSceneVisits).where(eq(storySessionSceneVisits.storySessionId, ids.session));
    await db.delete(storySessions).where(eq(storySessions.id, ids.session));
    await db.delete(storyScenes).where(eq(storyScenes.storyVersionId, ids.version));
    await db.delete(storyVersions).where(eq(storyVersions.id, ids.version));
    await db.delete(storyDefinitions).where(eq(storyDefinitions.id, ids.definition));
  });

  it("materializes generated prose, advances the canonical session and reloads the same prose from persisted reader state", async () => {
    if (!db) throw new Error("DATABASE_URL_REQUIRED");

    const scenario = createScenario({
      id: "L4-SCENE-SESSION-001",
      title: "Generated scene persists and becomes reader-visible session state",
      level: "L4",
      projectGate: "PX-LUMI-05",
      seed: "scene-session-001",
    });
    scenario.setup("Child", { id: ids.child, name: "Deniz", ageBand: "6-8" });
    scenario.setup("Character", { name: "Arin" });
    scenario.setup("NPC", { name: "Mira" });
    scenario.setup("World", { id: ids.world, name: "Gunes Vadisi" });

    await repo.createDefinition(db, {
      id: ids.definition,
      householdId: ids.household,
      childProfileId: ids.child,
      title: "ULTEF Generated Scene Story",
      slug: `ultef-generated-scene-${ids.definition}`,
      storyType: "interactive",
      sourceType: "generated",
      lifecycle: "published",
      ageGroup: "6-8",
      defaultLanguage: "tr",
      version: 1,
    });
    await repo.createVersion(db, {
      id: ids.version,
      storyDefinitionId: ids.definition,
      versionNumber: 1,
      publicationStatus: "published",
      schemaVersion: 1,
      title: "ULTEF Generated Scene Story v1",
      storyMode: "dynamic",
      publishedAt: new Date(),
    });
    await repo.createScene(db, {
      id: ids.entryScene,
      storyVersionId: ids.version,
      sceneKey: "entry",
      sequenceNumber: 0,
      sceneType: "narrative",
      title: "Baslangic",
      narrativeText: "Arin Gunes Vadisi'ndeki eski kutuphaneye girdi.",
      isEntryScene: true,
      isTerminalScene: false,
      metadata: {},
    });
    await repo.createSession(db, {
      id: ids.session,
      householdId: ids.household,
      childProfileId: ids.child,
      worldId: ids.world,
      storyDefinitionId: ids.definition,
      storyVersionId: ids.version,
      currentSceneId: ids.entryScene,
      sessionStatus: "active",
      playbackMode: "reading",
      startedAt: new Date(),
      lastInteractedAt: new Date(),
      contextSnapshot: {},
      version: 1,
    });
    await repo.createSceneVisit(db, {
      id: crypto.randomUUID(),
      storySessionId: ids.session,
      sceneId: ids.entryScene,
      visitSequence: 0,
      visitReason: "session_start",
      enteredAt: new Date(),
    });
    scenario.event("story.session.started", "Deniz icin Arin'in Gunes Vadisi hikaye oturumu baslatildi.");

    const generated = {
      sceneId: "llm-rumor-scene-001",
      setting: "Gunes Vadisi eski kutuphanesinin sicak okuma kosesi",
      characters: ["Arin", "Mira"],
      narrative:
        "Mira, Arin'e eski koprunun isiklarinin firtinadan once yandigina dair duydugu soylentiyi anlatti. Arin bunun ilk kim tarafindan goruldugunu merak etti.",
      moment: "Arin soylentinin kaynagini sormaya karar verdi.",
      nextPrompt: "Bunu ilk kim gordu?",
    };
    scenario.event("story.scene.generated", `Generated scene: ${generated.narrative}`);

    const result = await persistGeneratedSceneAndAdvance({
      sessionId: ids.session,
      expectedVersion: 1,
      scene: generated,
      modelId: "ultef-deterministic-provider",
      sourceHookId: "rumor-hook-001",
      idempotencyKey: `ultef-generated-scene:${ids.session}`,
    });
    scenario.event("story.session.advanced", `Session generated sahneye ilerledi; version 1 -> ${result.playbackState.session.version}.`);

    const reloaded = await repo.findSessionById(db, ids.session);
    const persistedScene = await repo.findSceneById(db, result.generatedSceneId);
    const visits = await repo.findSceneVisitsBySession(db, ids.session);
    const checkpoint = await repo.findLatestCheckpoint(db, ids.session);
    scenario.event("story.reader.reloaded", "Session, generated scene, visit ve checkpoint PostgreSQL'den yeniden okundu.");

    scenario.assert("Generated scene persisted once", result.reusedPersistedScene === false, false, result.reusedPersistedScene);
    scenario.assert("Session version advanced", result.playbackState.session.version === 2, 2, result.playbackState.session.version);
    scenario.assert("Reader points to generated scene", reloaded?.currentSceneId === result.generatedSceneId, result.generatedSceneId, reloaded?.currentSceneId ?? null);
    scenario.assert("Narrative survives DB reload", persistedScene?.narrativeText === generated.narrative, generated.narrative, persistedScene?.narrativeText ?? null);
    scenario.assert("Scene visit persisted", visits.at(-1)?.sceneId === result.generatedSceneId, result.generatedSceneId, visits.at(-1)?.sceneId ?? null);
    scenario.assert("Checkpoint persisted", checkpoint?.sceneId === result.generatedSceneId, result.generatedSceneId, checkpoint?.sceneId ?? null);
    scenario.delta("story.session.version", 1, reloaded?.version ?? null, "generated scene advancement");
    scenario.delta("story.session.currentSceneId", ids.entryScene, reloaded?.currentSceneId ?? null, "reader-visible generated scene");

    const passed =
      result.reusedPersistedScene === false &&
      reloaded?.version === 2 &&
      reloaded.currentSceneId === result.generatedSceneId &&
      persistedScene?.narrativeText === generated.narrative &&
      visits.at(-1)?.sceneId === result.generatedSceneId &&
      checkpoint?.sceneId === result.generatedSceneId;

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
