import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  StorySceneGenerationService,
  type OpenRouterCaller,
  type StorySceneLlmSettingsPort,
} from "@lumi/story/application";
import type { StoryHookState } from "@lumi/story/domain";

import { NpcBeliefStoryContinuityContextAdapter } from "@/lib/story-continuity-context-runtime";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { seedCanonicalNpcFixture } from "./helpers/canonical-npc-fixture";

const enabled = process.env.ULTEF_SCENARIO === "L5-CONTEXT-DIVERGENCE-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

let pool: pg.Pool;

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF continuity divergence requires a disposable DB; got '${name}'.`,
    );
  }
}

function makeHook(input: {
  householdId: string;
  childProfileId: string;
  worldId: string;
  sourceNpcId: string;
  storySessionId: string;
}): StoryHookState {
  return {
    id: crypto.randomUUID(),
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    storySessionId: input.storySessionId,
    worldId: input.worldId,
    opportunityId: crypto.randomUUID(),
    hookType: "rumor",
    sourceNpcId: input.sourceNpcId,
    targetNpcId: null,
    payload: { claim: "Yeni hikaye ipucu" },
    constraints: {},
    sceneType: "narrative",
    status: "pending",
    version: 1,
    createdAt: new Date(),
    consumedAt: null,
  };
}

const settingsPort: StorySceneLlmSettingsPort = {
  async resolveSettings() {
    return {
      apiKey: "ultef-test-key",
      modelId: "deterministic-ultef-provider",
      temperature: 0,
      maxOutputTokens: 512,
      contentBoundary: "guvenli cocuk hikayesi",
      ageBand: "6-8",
      locale: "tr-TR",
    };
  },
};

function capturingCaller(prompts: string[]): OpenRouterCaller {
  return async (_apiKey, input) => {
    const prompt =
      input.messages.find((message) => message.role === "user")?.content ?? "";
    prompts.push(prompt);
    return {
      model: "deterministic-ultef-provider",
      content: JSON.stringify({
        sceneId: "continuity-test-scene",
        setting: "Gunes Vadisi kutuphanesi",
        characters: ["Arin", "Bora"],
        narrative:
          "Arin ve Bora onceki bilgileri hatirlayarak yeni bir ipucunu konustu.",
        moment: "Hatirlanan bir bilgi yeni bir merak uyandirdi.",
        nextPrompt: "Arin ipucunu arastirmaya karar verdi.",
      }),
    };
  };
}

beforeAll(async () => {
  if (!enabled || !destructive || !databaseUrl) return;
  assertSafeDisposableDatabase(databaseUrl);
  pool = new pg.Pool({ connectionString: databaseUrl });
});

afterAll(async () => {
  if (pool) await pool.end();
});

ultefDescribe("ULTEF L5-CONTEXT-DIVERGENCE-001", () => {
  it("keeps persisted NPC continuity isolated by world and injects only the correct branch into story prompts", async () => {
    const householdId = crypto.randomUUID();
    const childProfileId = crypto.randomUUID();
    const childAvatarId = crypto.randomUUID();
    const npcAId = crypto.randomUUID();
    const npcBId = crypto.randomUUID();
    const worldA = crypto.randomUUID();
    const worldB = crypto.randomUUID();
    const fixtureKey = `context-divergence-${householdId}`;
    const claimA =
      "Bora, World A'da kopru isiklarinin firtinadan once yandigini biliyor.";
    const claimB =
      "Bora, World B'de eski degirmenin altinda gizli bir harita oldugunu biliyor.";

    const scenario = createScenario({
      id: "L5-CONTEXT-DIVERGENCE-001",
      title: "World-scoped continuity context divergence",
      level: "L5",
      projectGate: "PX-LUMI-09",
      seed: "l5-context-divergence-001",
    });

    try {
      await seedCanonicalNpcFixture(pool, {
        householdId,
        childProfileId,
        characterId: childAvatarId,
        worldId: worldA,
        fixtureKey,
        npcs: [{ id: npcAId, name: "Bora" }],
      });
      await seedCanonicalNpcFixture(pool, {
        householdId,
        childProfileId,
        characterId: childAvatarId,
        worldId: worldB,
        fixtureKey,
        npcs: [{ id: npcBId, name: "Bora" }],
      });

      await pool.query(
        `INSERT INTO npc_intelligence.beliefs
          (id, npc_id, household_id, world_id, fact_id, claim, confidence, source, provenance, status)
         VALUES
          ($1,$2,$3,$4,$5,$6,'0.90','hearsay',$7::jsonb,'active'),
          ($8,$9,$3,$10,$11,$12,'0.90','hearsay',$13::jsonb,'active')`,
        [
          crypto.randomUUID(),
          npcAId,
          householdId,
          worldA,
          "bridge-lights",
          claimA,
          JSON.stringify(["Mira-A"]),
          crypto.randomUUID(),
          npcBId,
          worldB,
          "hidden-map",
          claimB,
          JSON.stringify(["Mira-B"]),
        ],
      );

      scenario.setup("Household", { id: householdId });
      scenario.setup("World A NPC", { id: npcAId, name: "Bora" });
      scenario.setup("World B NPC", { id: npcBId, name: "Bora" });
      scenario.setup("World A continuity", { worldId: worldA, claim: claimA });
      scenario.setup("World B continuity", { worldId: worldB, claim: claimB });

      const adapter = new NpcBeliefStoryContinuityContextAdapter();
      const service = new StorySceneGenerationService();
      const promptsA: string[] = [];
      const promptsB: string[] = [];

      await service.generateSceneFromHook({
        hook: makeHook({
          householdId,
          childProfileId,
          worldId: worldA,
          sourceNpcId: npcAId,
          storySessionId: crypto.randomUUID(),
        }),
        settingsPort,
        continuityPort: adapter,
        characterId: childAvatarId,
        callOpenRouter: capturingCaller(promptsA),
      });

      await service.generateSceneFromHook({
        hook: makeHook({
          householdId,
          childProfileId,
          worldId: worldB,
          sourceNpcId: npcBId,
          storySessionId: crypto.randomUUID(),
        }),
        settingsPort,
        continuityPort: adapter,
        characterId: childAvatarId,
        callOpenRouter: capturingCaller(promptsB),
      });

      const promptA = promptsA[0] ?? "";
      const promptB = promptsB[0] ?? "";

      scenario.event(
        "world-a.context.loaded",
        `World A sonraki hikaye promptu Bora'nin A bilgisini gordu: ${claimA}`,
      );
      scenario.event(
        "world-b.context.loaded",
        `World B sonraki hikaye promptu Bora'nin B bilgisini gordu: ${claimB}`,
      );
      scenario.assert(
        "World A prompt contains A continuity",
        promptA.includes(claimA),
        true,
        promptA.includes(claimA),
      );
      scenario.assert(
        "World A prompt excludes B continuity",
        !promptA.includes(claimB),
        true,
        !promptA.includes(claimB),
      );
      scenario.assert(
        "World B prompt contains B continuity",
        promptB.includes(claimB),
        true,
        promptB.includes(claimB),
      );
      scenario.assert(
        "World B prompt excludes A continuity",
        !promptB.includes(claimA),
        true,
        !promptB.includes(claimA),
      );

      const passed =
        promptA.includes(claimA) &&
        !promptA.includes(claimB) &&
        promptB.includes(claimB) &&
        !promptB.includes(claimA);

      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "Two world-scoped canonical NPC identities with the same display name retained different persisted knowledge, and each later story-generation prompt received only its own world continuity."
          : "Continuity context leaked across world boundaries or failed to reach the story prompt.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-headless-e2e",
      });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(
        "DELETE FROM npc_intelligence.beliefs WHERE household_id = $1",
        [householdId],
      );
      await pool.query("DELETE FROM profile.households WHERE id = $1", [
        householdId,
      ]);
    }
  });
});
