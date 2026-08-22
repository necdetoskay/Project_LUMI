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

const SCENARIO_ID = "PX-LUMI-03-MEMORY-COHERENCE-001";
const enabled = process.env.ULTEF_SCENARIO === SCENARIO_ID;
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

let pool: pg.Pool;

const DIRECT_CLAIM =
  "Bora eski koprunun kapisinin kilitli oldugunu kendi gozleriyle gordu.";
const HEARSAY_CLAIM =
  "Mira, Bora'ya kopru isiklarinin firtinadan once yandigini anlatti.";
const FABRICATED_CLAIM = "Bora gizli bir ejderha yumurtasi buldu.";

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `PX-LUMI memory coherence requires a disposable DB; got '${name}'.`,
    );
  }
}

function makeHook(input: {
  householdId: string;
  childProfileId: string;
  worldId: string;
  npcId: string;
}): StoryHookState {
  return {
    id: crypto.randomUUID(),
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    storySessionId: crypto.randomUUID(),
    worldId: input.worldId,
    opportunityId: crypto.randomUUID(),
    hookType: "rumor",
    sourceNpcId: input.npcId,
    targetNpcId: null,
    payload: {
      claim: "Bora onceki bilgileriyle yeni bir ipucunu degerlendiriyor.",
    },
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
    const sawDirect = prompt.includes(DIRECT_CLAIM);
    const sawHearsay = prompt.includes(HEARSAY_CLAIM);
    const sawFabricated = prompt.includes(FABRICATED_CLAIM);
    return {
      model: "deterministic-ultef-provider",
      content: JSON.stringify({
        sceneId: "memory-coherence-scene",
        setting: "Gunes Vadisi eski koprusu",
        characters: ["Arin", "Bora"],
        narrative:
          sawDirect && sawHearsay && !sawFabricated
            ? `Bora kapinin kilitli oldugunu kendi gozleriyle gordugunu hatirladi. Ardindan Mira'dan duydugu isik soylentisini Arin'e aktardi.`
            : "Bora onceki bilgilerini hatirlamaya calisti.",
        moment: "Dogru kaynakli iki bilgi yeni sahnede birlikte kullanildi.",
        nextPrompt: "Arin hangi bilgiyi once arastirsin?",
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

ultefDescribe(`ULTEF ${SCENARIO_ID}`, () => {
  it("keeps direct observation and hearsay source semantics distinct and never fabricates absent memory", async () => {
    const householdId = crypto.randomUUID();
    const childProfileId = crypto.randomUUID();
    const childAvatarId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const npcId = crypto.randomUUID();
    const scenario = createScenario({
      id: SCENARIO_ID,
      title:
        "Direct observation and hearsay remain coherent in later story context",
      level: "L4",
      projectGate: "PX-LUMI-03",
      seed: "px-lumi-03-memory-coherence-001",
    });

    try {
      await seedCanonicalNpcFixture(pool, {
        householdId,
        childProfileId,
        characterId: childAvatarId,
        worldId,
        fixtureKey: `memory-coherence-${householdId}`,
        npcs: [{ id: npcId, name: "Bora" }],
      });

      await pool.query(
        `INSERT INTO npc_intelligence.beliefs
          (id, npc_id, household_id, world_id, fact_id, claim, confidence, source, provenance, status)
         VALUES
          ($1,$2,$3,$4,'locked-bridge-door',$5,'0.95','direct_observation','[]'::jsonb,'active'),
          ($6,$2,$3,$4,'bridge-lights-before-storm',$7,'0.80','hearsay',$8::jsonb,'active')`,
        [
          crypto.randomUUID(),
          npcId,
          householdId,
          worldId,
          DIRECT_CLAIM,
          crypto.randomUUID(),
          HEARSAY_CLAIM,
          JSON.stringify(["Mira"]),
        ],
      );

      scenario.setup("NPC", { id: npcId, name: "Bora" });
      scenario.setup("Direct observation", {
        claim: DIRECT_CLAIM,
        source: "direct_observation",
        confidence: 0.95,
      });
      scenario.setup("Hearsay", {
        claim: HEARSAY_CLAIM,
        source: "hearsay",
        confidence: 0.8,
        provenance: ["Mira"],
      });
      scenario.setup("Absent memory", FABRICATED_CLAIM);

      const adapter = new NpcBeliefStoryContinuityContextAdapter();
      const context = await adapter.resolveContext({
        householdId,
        worldId,
        childProfileId,
        characterId: childAvatarId,
        npcIds: [npcId],
      });

      const directFact = context.facts.find((fact) =>
        fact.summary.includes(DIRECT_CLAIM),
      );
      const hearsayFact = context.facts.find((fact) =>
        fact.summary.includes(HEARSAY_CLAIM),
      );
      const fabricatedFact = context.facts.find((fact) =>
        fact.summary.includes(FABRICATED_CLAIM),
      );

      scenario.event(
        "memory.context.reloaded",
        "Bora'nin persisted direct observation ve hearsay bilgileri PostgreSQL'den production continuity adapter ile yeniden yuklendi.",
        { facts: context.facts },
      );

      scenario.assert(
        "Direct observation keeps direct source semantics",
        directFact?.source === "direct_observation",
        "direct_observation",
        directFact?.source ?? null,
      );
      scenario.assert(
        "Hearsay keeps provenance-bearing source semantics",
        hearsayFact?.source === "hearsay:Mira",
        "hearsay:Mira",
        hearsayFact?.source ?? null,
      );
      scenario.assert(
        "Absent memory is not fabricated by retrieval",
        !fabricatedFact,
        false,
        Boolean(fabricatedFact),
      );

      const prompts: string[] = [];
      const generated =
        await new StorySceneGenerationService().generateSceneFromHook({
          hook: makeHook({ householdId, childProfileId, worldId, npcId }),
          settingsPort,
          continuityPort: adapter,
          characterId: childAvatarId,
          callOpenRouter: capturingCaller(prompts),
        });
      const prompt = prompts[0] ?? "";

      scenario.event(
        "memory.used.in.later-story",
        "Daha sonraki story-generation promptu hem direct observation hem hearsay bilgisini aldi; olmayan ejderha bilgisi prompta girmedi.",
      );
      scenario.assert(
        "Later story context receives the direct observation",
        prompt.includes(DIRECT_CLAIM),
        true,
        prompt.includes(DIRECT_CLAIM),
      );
      scenario.assert(
        "Later story context receives the hearsay",
        prompt.includes(HEARSAY_CLAIM),
        true,
        prompt.includes(HEARSAY_CLAIM),
      );
      scenario.assert(
        "Later story context does not receive nonexistent memory",
        !prompt.includes(FABRICATED_CLAIM),
        true,
        !prompt.includes(FABRICATED_CLAIM),
      );
      scenario.assert(
        "Generated prose uses only the persisted relevant memories",
        generated.scene.narrative.includes("kapinin kilitli") &&
          generated.scene.narrative.includes("Mira'dan duydugu") &&
          !generated.scene.narrative.includes("ejderha"),
        true,
        generated.scene.narrative,
      );

      scenario.delta(
        "Bora.memory.direct-observation.visible-to-story",
        false,
        true,
        "persisted direct observation reloaded into story continuity context",
      );
      scenario.delta(
        "Bora.memory.hearsay.visible-to-story",
        false,
        true,
        "persisted hearsay with provenance reloaded into story continuity context",
      );
      scenario.delta(
        "Bora.memory.fabricated.present",
        false,
        false,
        "nonexistent memory remained absent",
      );

      const passed =
        directFact?.source === "direct_observation" &&
        hearsayFact?.source === "hearsay:Mira" &&
        !fabricatedFact &&
        prompt.includes(DIRECT_CLAIM) &&
        prompt.includes(HEARSAY_CLAIM) &&
        !prompt.includes(FABRICATED_CLAIM) &&
        !generated.scene.narrative.includes("ejderha");

      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "Persisted direct observation and hearsay remained source-distinct after reload, both reached the later story context, and an absent memory was neither retrieved nor fabricated."
          : "Memory source semantics, retrieval, later-story use or non-fabrication did not satisfy the PX-LUMI-03 contract.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-deterministic-provider-e2e",
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
