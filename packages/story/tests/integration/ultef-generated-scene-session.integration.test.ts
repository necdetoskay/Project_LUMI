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

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

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

    const generated = {
      sceneId: "llm-rumor-scene-001",
      setting: "Gunes Vadisi eski kutuphanesinin sicak okuma kosesi",
      characters: ["Arin", "Mira"],
      narrative:
        "Mira, Arin'e eski koprunun isiklarinin firtinadan once yandigina dair duydugu soylentiyi anlatti. Arin bunun ilk kim tarafindan goruldugunu merak etti.",
      moment: "Arin soylentinin kaynagini sormaya karar verdi.",
      nextPrompt: "Bunu ilk kim gordu?",
    };

    const result = await persistGeneratedSceneAndAdvance({
      sessionId: ids.session,
      expectedVersion: 1,
      scene: generated,
      modelId: "ultef-deterministic-provider",
      sourceHookId: "rumor-hook-001",
      idempotencyKey: `ultef-generated-scene:${ids.session}`,
    });

    expect(result.reusedPersistedScene).toBe(false);
    expect(result.playbackState.session.version).toBe(2);
    expect(result.playbackState.session.currentSceneId).toBe(result.generatedSceneId);
    expect(result.playbackState.currentScene?.narrativeText).toBe(generated.narrative);
    expect(result.playbackState.currentScene?.metadata).toMatchObject({
      generated: true,
      generatedForSessionId: ids.session,
      sourceGeneratedSceneId: "llm-rumor-scene-001",
      sourceHookId: "rumor-hook-001",
      characters: ["Arin", "Mira"],
    });

    const reloaded = await repo.findSessionById(db, ids.session);
    const persistedScene = await repo.findSceneById(db, result.generatedSceneId);
    const visits = await repo.findSceneVisitsBySession(db, ids.session);
    const checkpoint = await repo.findLatestCheckpoint(db, ids.session);

    expect(reloaded?.version).toBe(2);
    expect(reloaded?.currentSceneId).toBe(result.generatedSceneId);
    expect(persistedScene?.narrativeText).toBe(generated.narrative);
    expect(visits.at(-1)?.sceneId).toBe(result.generatedSceneId);
    expect(checkpoint?.sceneId).toBe(result.generatedSceneId);
  });
});
