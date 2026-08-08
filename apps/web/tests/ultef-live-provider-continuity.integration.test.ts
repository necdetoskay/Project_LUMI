import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { callOpenRouter } from "@lumi/profiles/application";
import {
  StorySceneGenerationService,
  type OpenRouterCaller,
  type StorySceneLlmSettingsPort,
} from "@lumi/story/application";
import type { StoryHookState } from "@lumi/story/domain";

import { NpcBeliefStoryContinuityContextAdapter } from "@/lib/story-continuity-context-runtime";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";

const enabled = process.env.ULTEF_REAL_PROVIDER_ENABLED === "true";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const apiKey = process.env.OPENROUTER_API_KEY;
const modelId = process.env.ULTEF_REAL_PROVIDER_MODEL;
const ultefDescribe =
  enabled && destructive && databaseUrl && apiKey && modelId
    ? describe
    : describe.skip;

let pool: pg.Pool;

const CLAIM =
  "Bora, Mira'dan köprü ışıklarının fırtınadan önce yandığını duydu.";

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(`ULTEF live-provider test requires disposable DB; got '${name}'.`);
  }
}

function makeHook(input: {
  householdId: string;
  childProfileId: string;
  worldId: string;
  sourceNpcId: string;
}): StoryHookState {
  return {
    id: crypto.randomUUID(),
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    storySessionId: crypto.randomUUID(),
    worldId: input.worldId,
    opportunityId: crypto.randomUUID(),
    hookType: "rumor",
    sourceNpcId: input.sourceNpcId,
    targetNpcId: null,
    payload: {
      claim:
        "Arin, Bora ile yeniden karşılaşır ve eski köprü söylentisinin peşine düşer.",
    },
    constraints: {},
    sceneType: "narrative",
    status: "pending",
    version: 1,
    createdAt: new Date(),
    consumedAt: null,
  };
}

beforeAll(async () => {
  if (!databaseUrl || !enabled) return;
  assertSafeDisposableDatabase(databaseUrl);
  pool = new pg.Pool({ connectionString: databaseUrl });
});

afterAll(async () => {
  if (pool) await pool.end();
});

ultefDescribe("ULTEF L7-LIVE-CONTINUITY-001", () => {
  it("uses the production OpenRouter client and recalls persisted continuity in child-safe generated prose", async () => {
    const householdId = crypto.randomUUID();
    const childProfileId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const boraNpcId = crypto.randomUUID();
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null;

    const scenario = createScenario({
      id: "L7-LIVE-CONTINUITY-001",
      title: "Live provider recalls persisted continuity",
      level: "L7",
      projectGate: "PX-LUMI-09",
      seed: "live-provider-nondeterministic",
    });

    try {
      await pool.query(
        `INSERT INTO npc_intelligence.beliefs
          (id, npc_id, household_id, world_id, fact_id, claim, confidence, source, provenance, status)
         VALUES ($1,$2,$3,$4,$5,$6,'0.90','hearsay',$7::jsonb,'active')`,
        [
          crypto.randomUUID(),
          boraNpcId,
          householdId,
          worldId,
          "bridge-lights-before-storm",
          CLAIM,
          JSON.stringify(["Mira"]),
        ],
      );

      const settingsPort: StorySceneLlmSettingsPort = {
        async resolveSettings() {
          return {
            apiKey: apiKey!,
            modelId: modelId!,
            temperature: 0.2,
            maxOutputTokens: 700,
            contentBoundary:
              "6-8 yaş için güvenli; şiddet, korku, yetişkin teması ve tehdit yok",
            ageBand: "6-8",
            locale: "tr-TR",
          };
        },
      };

      const liveCaller: OpenRouterCaller = async (key, input) => {
        const response = await callOpenRouter(key, {
          model: input.model,
          messages: input.messages,
          temperature: input.temperature,
          maxTokens: input.maxTokens,
        });
        usage = response.usage;
        return { content: response.content, model: response.model };
      };

      scenario.setup("Live provider", { model: modelId });
      scenario.setup("Child", { ageBand: "6-8", childProfileId });
      scenario.setup("Persisted continuity", { worldId, npc: "Bora", claim: CLAIM });

      const service = new StorySceneGenerationService();
      const adapter = new NpcBeliefStoryContinuityContextAdapter();
      const startedAt = Date.now();
      const generated = await service.generateSceneFromHook({
        hook: makeHook({ householdId, childProfileId, worldId, sourceNpcId: boraNpcId }),
        settingsPort,
        continuityPort: adapter,
        characterId: "Arin",
        callOpenRouter: liveCaller,
        maxAttempts: 1,
      });
      const latencyMs = Date.now() - startedAt;
      const narrative = generated.scene.narrative;
      const normalized = narrative.toLocaleLowerCase("tr-TR");

      const continuityRecall =
        normalized.includes("köprü") &&
        normalized.includes("ışık") &&
        normalized.includes("fırtına");
      const characterConsistency =
        generated.scene.characters.some((name) => name.toLocaleLowerCase("tr-TR") === "arin") &&
        generated.scene.characters.some((name) => name.toLocaleLowerCase("tr-TR") === "bora");
      const forbiddenTerms = ["öldür", "kanlı", "silah", "dehşet", "cinsel"];
      const childSafetyLexical = !forbiddenTerms.some((term) => normalized.includes(term));
      const schemaValid = narrative.length > 0 && generated.scene.setting.length > 0;
      const passed =
        continuityRecall && characterConsistency && childSafetyLexical && schemaValid;

      scenario.event("live.story.generated", `Model ${generated.modelId}: ${narrative}`);
      scenario.event("live.provider.metrics", {
        latencyMs,
        usage,
        attempt: generated.attempt,
      });
      scenario.assert("Continuity is visibly recalled", continuityRecall, true, continuityRecall);
      scenario.assert(
        "Arin and Bora remain present",
        characterConsistency,
        true,
        generated.scene.characters,
      );
      scenario.assert(
        "Basic child-safety lexical gate passes",
        childSafetyLexical,
        true,
        childSafetyLexical,
      );
      scenario.assert("Generated output remains schema-valid", schemaValid, true, schemaValid);

      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "The live provider received world-scoped persisted continuity and generated schema-valid, child-safe prose that visibly recalled the prior bridge-lights rumor."
          : "The live provider failed one or more continuity, character, safety, or schema gates.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-live-openrouter-opt-in",
      });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(
        "DELETE FROM npc_intelligence.beliefs WHERE household_id = $1",
        [householdId],
      );
    }
  });
});
