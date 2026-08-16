import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { encryptApiKey } from "../../../packages/profiles/src/application/llm-settings/encryption";
import { getSessionPlaybackState } from "../../../packages/story/src/application/index";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { generateHookReaderTurn } from "../lib/story/generated-hook-reader.service";

const ID = "PX-LUMI-S37-HOOK-READER-PROD-001";
const url = process.env.STORY_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const run =
  process.env.ULTEF_SCENARIO === ID &&
  process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true" &&
  url
    ? describe
    : describe.skip;

let pool: pg.Pool;
let server: Server;
let providerCalls = 0;

function startProvider(): Promise<number> {
  return new Promise((resolve) => {
    server = createServer((request, response) => {
      if (request.url !== "/chat/completions") {
        response.statusCode = 404;
        response.end();
        return;
      }
      providerCalls += 1;
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sceneId: `ultef-scene-${providerCalls}`,
                  setting: "Ay ışığındaki güvenli orman yolu",
                  characters: ["Lumi", "Bilge Baykuş"],
                  narrative:
                    "Lumi, Bilge Baykuş'un nazik uyarısını hatırlayarak parlayan taşların yanından dikkatle ilerledi.",
                  moment: "Nazik uyarı hikâyeye dönüştü",
                  nextPrompt: "Patikanın ilerisindeki ışığı araştır.",
                }),
              },
            },
          ],
          model: "ultef/mock-story-model",
          usage: {
            prompt_tokens: 12,
            completion_tokens: 24,
            total_tokens: 36,
          },
        }),
      );
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Mock provider did not expose a TCP port");
      }
      resolve(address.port);
    });
  });
}

run("ULTEF S37 generated hook reader production", () => {
  beforeAll(async () => {
    const db = new URL(url!).pathname.replace(/^\//, "");
    if (!db.includes("test") && !db.includes("review")) {
      throw new Error(`Unsafe DB: ${db}`);
    }
    pool = new pg.Pool({ connectionString: url!, max: 4 });
    const port = await startProvider();
    process.env.OPENROUTER_API_BASE_URL = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await pool?.end();
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  });

  it(ID, async () => {
    const user = crypto.randomUUID();
    const h1 = crypto.randomUUID();
    const h2 = crypto.randomUUID();
    const c1 = crypto.randomUUID();
    const c2 = crypto.randomUUID();
    const character = crypto.randomUUID();
    const firstOriginPackage = crypto.randomUUID();
    const world = crypto.randomUUID();
    const def = crypto.randomUUID();
    const version = crypto.randomUUID();
    const initialScene = crypto.randomUUID();
    const session = crypto.randomUUID();
    const hook = crypto.randomUUID();
    const failingHook = crypto.randomUUID();
    const foreignHook = crypto.randomUUID();
    const sourceNpc = crypto.randomUUID();
    const taskSetting = crypto.randomUUID();
    const providerSetting = crypto.randomUUID();
    const scenario = createScenario({
      id: ID,
      title: "Generated hook scene reaches Story Reader",
      level: "L9",
      projectGate: "PX-LUMI-S37",
      seed: "runtime-uuid",
    });

    try {
      const encryptedKey = encryptApiKey("ultef-openrouter-key");
      await pool.query(
        `INSERT INTO profile.households(id,name,slug)
         VALUES($1,'S37 A',$3),($2,'S37 B',$4)`,
        [h1, h2, `s37-a-${h1}`, `s37-b-${h2}`],
      );
      await pool.query(
        `INSERT INTO profile.household_members
          (household_id,user_id,membership_role,is_active)
         VALUES($1,$3,'owner',true),($2,$3,'owner',true)`,
        [h1, h2, user],
      );
      await pool.query(
        `INSERT INTO profile.child_profiles
          (id,household_id,display_name,age_band,locale)
         VALUES($1,$3,'Lumi','6-8','tr-TR'),($2,$4,'Mira','6-8','tr-TR')`,
        [c1, c2, h1, h2],
      );
      await pool.query(
        `INSERT INTO profile.lumi_characters
          (id,child_profile_id,household_id,name,broad_kind,character_type,subtype,
           origin_mode,first_origin_package_id,origin_concept,starting_region_archetype,
           starting_location,home_archetype,nearby_npc_seed,first_mystery_seed,
           universe_seed,safety_bounds)
         VALUES($1,$2,$3,'Lumi','human','explorer','gezgin','manual',$4,
           'Nazik bir kâşif','forest','safe-path','tree-home','owl-seed',
           'light-seed','s37-universe','{}'::jsonb)`,
        [character, c1, h1, firstOriginPackage],
      );
      await pool.query(
        `INSERT INTO profile.worlds
          (id,household_id,child_profile_id,character_id,universe_seed,origin_seed,
           accepted_candidate_seed,generator_version,vector_version,lifecycle_status,metadata)
         VALUES($1,$2,$3,$4,'s37-universe','s37-origin','s37-candidate',
           'ultef-s37','v1','active','{}'::jsonb)`,
        [world, h1, c1, character],
      );
      await pool.query(
        `INSERT INTO profile.parental_settings
          (household_id,content_boundary,require_parent_approval_for_ai)
         VALUES($1,'strict',false),($2,'strict',false)`,
        [h1, h2],
      );
      await pool.query(
        `INSERT INTO profile.llm_provider_settings
          (id,user_id,household_id,provider,encrypted_api_key,enabled)
         VALUES($1,$2,$3,'openrouter',$4,true)`,
        [providerSetting, user, h1, encryptedKey],
      );
      await pool.query(
        `INSERT INTO profile.llm_task_model_settings
          (id,user_id,household_id,provider,task_type,model_id,reasoning_level,temperature,max_output_tokens,enabled)
         VALUES($1,$2,$3,'openrouter','story_turn_generation','ultef/mock-story-model','low',0.4,900,true)`,
        [taskSetting, user, h1],
      );

      await pool.query(
        `INSERT INTO story.story_definitions
          (id,household_id,child_profile_id,title,slug,story_type,source_type,lifecycle,age_group,default_language)
         VALUES($1,$2,$3,'S37 Story',$4,'interactive','generated','published','6-8','tr-TR')`,
        [def, h1, c1, `s37-${def}`],
      );
      await pool.query(
        `INSERT INTO story.story_versions
          (id,story_definition_id,version_number,publication_status,title,story_mode,published_at)
         VALUES($1,$2,1,'published','S37 Story','dynamic',now())`,
        [version, def],
      );
      await pool.query(
        `INSERT INTO story.story_scenes
          (id,story_version_id,scene_key,sequence_number,scene_type,title,narrative_text,is_entry_scene,is_terminal_scene,metadata)
         VALUES($1,$2,'entry',0,'narrative','Başlangıç','Başlangıç sahnesi',true,false,'{}'::jsonb)`,
        [initialScene, version],
      );
      await pool.query(
        `INSERT INTO story.story_sessions
          (id,household_id,child_profile_id,world_id,story_definition_id,story_version_id,current_scene_id,session_status,playback_mode,started_at,last_interacted_at,context_snapshot,version)
         VALUES($1,$2,$3,$4,$5,$6,$7,'active','reading',now(),now(),'{}'::jsonb,1)`,
        [session, h1, c1, world, def, version, initialScene],
      );
      await pool.query(
        `INSERT INTO story.story_hooks
          (id,household_id,child_profile_id,story_session_id,world_id,opportunity_id,hook_type,source_npc_id,payload,constraints,scene_type,status,version)
         VALUES
          ($1,$4,$5,$6,$7,$8,'warning',$9,$10::jsonb,'{}'::jsonb,'narrative','pending',1),
          ($2,$4,$5,$6,$7,$11,'warning',$9,$12::jsonb,'{}'::jsonb,'narrative','pending',1),
          ($3,$13,$14,$6,$7,$15,'warning',$9,$16::jsonb,'{}'::jsonb,'narrative','pending',1)`,
        [
          hook,
          failingHook,
          foreignHook,
          h1,
          c1,
          session,
          world,
          `s37-good-${hook}`,
          sourceNpc,
          JSON.stringify({ claim: "Parlayan taşlara dikkat et." }),
          `s37-fail-${failingHook}`,
          JSON.stringify({ claim: "Bu çağrı ayarsız kalmalı." }),
          h2,
          c2,
          `s37-foreign-${foreignHook}`,
          JSON.stringify({ claim: "Yabancı tenant hook'u." }),
        ],
      );

      const first = await generateHookReaderTurn({
        userId: user,
        householdId: h1,
        sessionId: session,
        hookId: hook,
        expectedVersion: 1,
      });
      const firstState = await getSessionPlaybackState(session);
      const generatedCountResult = await pool.query<{ count: string }>(
        `SELECT count(*)::text count FROM story.story_scenes
          WHERE story_version_id=$1 AND scene_key=$2`,
        [version, `generated:hook:${hook}`],
      );
      const firstOk =
        first.generated === true &&
        firstState.session.version === 2 &&
        firstState.currentScene?.id === first.sceneId &&
        firstState.currentScene?.narrativeText.includes("Bilge Baykuş") ===
          true &&
        Number(generatedCountResult.rows[0]?.count ?? 0) === 1 &&
        providerCalls === 1;
      scenario.assert(
        "generated scene reached canonical reader state",
        firstOk,
        true,
        {
          sceneId: first.sceneId,
          version: firstState.session.version,
          providerCalls,
        },
      );

      const replay = await generateHookReaderTurn({
        userId: user,
        householdId: h1,
        sessionId: session,
        hookId: hook,
        expectedVersion: 1,
      });
      const replayState = await getSessionPlaybackState(session);
      const replayCountResult = await pool.query<{ count: string }>(
        `SELECT count(*)::text count FROM story.story_scenes
          WHERE story_version_id=$1 AND scene_key=$2`,
        [version, `generated:hook:${hook}`],
      );
      const replayOk =
        replay.generated === false &&
        replay.reusedPersistedScene === true &&
        replayState.session.version === 2 &&
        replayState.currentScene?.id === first.sceneId &&
        Number(replayCountResult.rows[0]?.count ?? 0) === 1 &&
        providerCalls === 1;
      scenario.assert("replay skipped LLM and double advance", replayOk, true, {
        providerCalls,
        version: replayState.session.version,
      });

      await pool.query(
        `UPDATE profile.llm_task_model_settings SET enabled=false WHERE id=$1`,
        [taskSetting],
      );
      const beforeFailure = await getSessionPlaybackState(session);
      let failedClosed = false;
      try {
        await generateHookReaderTurn({
          userId: user,
          householdId: h1,
          sessionId: session,
          hookId: failingHook,
          expectedVersion: beforeFailure.session.version,
        });
      } catch (error) {
        failedClosed =
          error instanceof Error && error.message.includes("disabled");
      }
      const afterFailure = await getSessionPlaybackState(session);
      const failureSceneCount = await pool.query<{ count: string }>(
        `SELECT count(*)::text count FROM story.story_scenes
          WHERE story_version_id=$1 AND scene_key=$2`,
        [version, `generated:hook:${failingHook}`],
      );
      const failureOk =
        failedClosed &&
        afterFailure.session.version === beforeFailure.session.version &&
        afterFailure.currentScene?.id === beforeFailure.currentScene?.id &&
        Number(failureSceneCount.rows[0]?.count ?? 0) === 0 &&
        providerCalls === 1;
      scenario.assert(
        "settings failure left session unchanged",
        failureOk,
        true,
        { failedClosed, providerCalls },
      );

      let tenantRejected = false;
      try {
        await generateHookReaderTurn({
          userId: user,
          householdId: h1,
          sessionId: session,
          hookId: foreignHook,
          expectedVersion: afterFailure.session.version,
        });
      } catch (error) {
        tenantRejected =
          error instanceof Error && error.message.includes("StoryHook");
      }
      scenario.assert(
        "foreign tenant hook rejected",
        tenantRejected,
        true,
        tenantRejected,
      );

      const consumed = await pool.query<{
        status: string;
        consumed_at: Date | null;
      }>(`SELECT status,consumed_at FROM story.story_hooks WHERE id=$1`, [
        hook,
      ]);
      const consumedOk =
        consumed.rows[0]?.status === "consumed" &&
        consumed.rows[0]?.consumed_at instanceof Date;
      scenario.assert(
        "committed hook marked consumed",
        consumedOk,
        true,
        consumed.rows[0],
      );

      const pass =
        firstOk && replayOk && failureOk && tenantRejected && consumedOk;
      const report = scenario.finish({
        result: pass ? "PASS" : "FAIL",
        reason: pass
          ? "Real settings adapter, generated scene persistence, reader visibility, replay, failure safety and tenant isolation verified."
          : "S37 production wiring invariant failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-s37-hook-reader",
      });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(
        `DELETE FROM story.story_generation_inspections WHERE story_session_id=$1`,
        [session],
      );
      await pool.query(
        `DELETE FROM story.story_idempotency_ledger WHERE household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM story.story_event_store WHERE actor_household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM story.story_session_checkpoints WHERE story_session_id=$1`,
        [session],
      );
      await pool.query(
        `DELETE FROM story.story_session_scene_visits WHERE story_session_id=$1`,
        [session],
      );
      await pool.query(
        `DELETE FROM story.story_hooks WHERE household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(`DELETE FROM story.story_sessions WHERE id=$1`, [
        session,
      ]);
      await pool.query(
        `DELETE FROM story.story_scenes WHERE story_version_id=$1`,
        [version],
      );
      await pool.query(`DELETE FROM story.story_versions WHERE id=$1`, [
        version,
      ]);
      await pool.query(`DELETE FROM story.story_definitions WHERE id=$1`, [
        def,
      ]);
      await pool.query(`DELETE FROM profile.worlds WHERE id=$1`, [world]);
      await pool.query(`DELETE FROM profile.lumi_characters WHERE id=$1`, [
        character,
      ]);
      await pool.query(
        `DELETE FROM profile.llm_task_model_settings WHERE household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM profile.llm_provider_settings WHERE household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM profile.parental_settings WHERE household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM profile.child_profiles WHERE household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(
        `DELETE FROM profile.household_members WHERE household_id IN($1,$2)`,
        [h1, h2],
      );
      await pool.query(`DELETE FROM profile.households WHERE id IN($1,$2)`, [
        h1,
        h2,
      ]);
    }
  });
});
