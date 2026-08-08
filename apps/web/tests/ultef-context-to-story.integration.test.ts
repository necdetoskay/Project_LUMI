import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import {
  StorySceneGenerationService,
  type OpenRouterCaller,
  type StorySceneLlmSettingsPort,
} from "@lumi/story/application";
import type { StoryHookState } from "@lumi/story/domain";

import { NpcBeliefStoryContinuityContextAdapter } from "@/lib/story-continuity-context-runtime";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";

const enabled = process.env.ULTEF_SCENARIO === "L6-CONTEXT-TO-STORY-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

let pool: pg.Pool;

const CLAIM =
  "Bora, Mira'dan kopru isiklarinin firtinadan once yandigini duydu.";

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF context-to-story requires a disposable DB; got '${name}'.`,
    );
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
    payload: { claim: "Arin Bora ile yeniden karsilasti." },
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

function continuityAwareCaller(capturedPrompts: string[]): OpenRouterCaller {
  return async (_apiKey, input) => {
    const prompt =
      input.messages.find((message) => message.role === "user")?.content ?? "";
    capturedPrompts.push(prompt);
    const remembersClaim = prompt.includes(CLAIM);
    return {
      model: "deterministic-ultef-provider",
      content: JSON.stringify({
        sceneId: "later-continuity-scene",
        setting: "Gunes Vadisi eski koprusu",
        characters: ["Arin", "Bora"],
        narrative: remembersClaim
          ? `Bora, Arin'i gorunce onceki konusmayi hatirladi. ${CLAIM} Arin bu eski bilginin pesinden gitmeye karar verdi.`
          : "Bora, Arin ile yeni bir konu hakkinda konustu.",
        moment: remembersClaim
          ? "Eski bir soylenti yeni hikayede yeniden anlam kazandi."
          : "Yeni bir merak ortaya cikti.",
        nextPrompt: "Arin kopru isiklarinin sirrini arastirsin.",
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

ultefDescribe("ULTEF L6-CONTEXT-TO-STORY-001", () => {
  it("turns persisted prior-story continuity into visible prose in a later generated story", async () => {
    const householdId = crypto.randomUUID();
    const childProfileId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const boraNpcId = crypto.randomUUID();
    const scenario = createScenario({
      id: "L6-CONTEXT-TO-STORY-001",
      title: "Persisted continuity reaches later generated story prose",
      level: "L6",
      projectGate: "PX-LUMI-09",
      seed: "l6-context-to-story-001",
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

      scenario.setup("Child", { name: "Deniz", id: childProfileId });
      scenario.setup("Character", { name: "Arin" });
      scenario.setup("World", { name: "Gunes Vadisi", id: worldId });
      scenario.setup("NPC", { name: "Bora", id: boraNpcId });
      scenario.event(
        "story-1.memory.persisted",
        `Onceki hikayeden Bora'nin kalici hearsay bilgisi kaydedildi: ${CLAIM}`,
      );

      const prompts: string[] = [];
      const service = new StorySceneGenerationService();
      const adapter = new NpcBeliefStoryContinuityContextAdapter();
      const generated = await service.generateSceneFromHook({
        hook: makeHook({
          householdId,
          childProfileId,
          worldId,
          sourceNpcId: boraNpcId,
        }),
        settingsPort,
        continuityPort: adapter,
        characterId: "Arin",
        callOpenRouter: continuityAwareCaller(prompts),
      });

      const prompt = prompts[0] ?? "";
      const narrative = generated.scene.narrative;
      scenario.event(
        "story-2.context.loaded",
        prompt.includes(CLAIM)
          ? `Story 2 context onceki bilgiyi yukledi: ${CLAIM}`
          : "Story 2 context onceki bilgiyi yukleyemedi.",
      );
      scenario.event(
        "story-2.generated",
        `Uretilen sonraki hikaye: ${narrative}`,
      );
      scenario.assert(
        "Later story prompt receives prior persisted continuity",
        prompt.includes(CLAIM),
        true,
        prompt.includes(CLAIM),
      );
      scenario.assert(
        "Later generated prose visibly recalls prior continuity",
        narrative.includes(CLAIM),
        true,
        narrative.includes(CLAIM),
      );
      scenario.assert(
        "Later story includes Bora and Arin",
        generated.scene.characters.includes("Bora") &&
          generated.scene.characters.includes("Arin"),
        true,
        generated.scene.characters,
      );

      const passed =
        prompt.includes(CLAIM) &&
        narrative.includes(CLAIM) &&
        generated.scene.characters.includes("Bora") &&
        generated.scene.characters.includes("Arin");
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "A prior story's persisted Bora/Mira rumor was loaded through the world-scoped continuity adapter and visibly recalled in the prose of the later generated story."
          : "Persisted continuity failed to reach either the later prompt or the generated prose.",
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
    }
  });
});
