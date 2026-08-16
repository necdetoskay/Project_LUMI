import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { encryptApiKey } from "../../../packages/profiles/src/application/llm-settings/encryption";
import {
  getGenerationInspection,
  getSessionPlaybackState,
} from "../../../packages/story/src/application/index";
import { generateHookReaderTurn } from "../lib/story/generated-hook-reader.service";

const url = process.env.STORY_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const enabled =
  process.env.LUMI_LIVE_DB_E2E === "1" &&
  process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true" &&
  Boolean(process.env.OPENROUTER_API_KEY) &&
  Boolean(process.env.LUMI_SETTINGS_ENCRYPTION_KEY) &&
  Boolean(url);
const live = enabled ? describe : describe.skip;

live("Context DB-backed production E2E", () => {
  let pool: pg.Pool;

  beforeAll(() => {
    const databaseName = new URL(url!).pathname.replace(/^\//, "");
    if (!databaseName.includes("test") && !databaseName.includes("review")) {
      throw new Error(
        `Unsafe DB for destructive Context E2E: ${databaseName}. Use a test/review database.`,
      );
    }
    pool = new pg.Pool({ connectionString: url!, max: 4 });
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("seeds a disposable graph, builds canonical context, calls the real LLM, persists scene and inspector snapshot, then cleans up", async () => {
    const userId = crypto.randomUUID();
    const householdId = crypto.randomUUID();
    const childProfileId = crypto.randomUUID();
    const characterId = crypto.randomUUID();
    const firstOriginPackageId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const storyDefinitionId = crypto.randomUUID();
    const storyVersionId = crypto.randomUUID();
    const entrySceneId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const hookId = crypto.randomUUID();
    const sourceNpcId = crypto.randomUUID();
    const providerSettingId = crypto.randomUUID();
    const taskSettingId = crypto.randomUUID();
    const runMarker = `context-live-${householdId}`;

    try {
      const encryptedPlaceholderKey = encryptApiKey(
        "gateway-owned-openrouter-secret",
      );

      await pool.query(
        `INSERT INTO profile.households(id,name,slug)
           VALUES($1,'Context Production E2E',$2)`,
        [householdId, runMarker],
      );
      await pool.query(
        `INSERT INTO profile.household_members
            (household_id,user_id,membership_role,is_active)
           VALUES($1,$2,'owner',true)`,
        [householdId, userId],
      );
      await pool.query(
        `INSERT INTO profile.child_profiles
            (id,household_id,display_name,age_band,locale,metadata)
           VALUES($1,$2,'Lumi E2E','6-8','tr-TR',$3::jsonb)`,
        [
          childProfileId,
          householdId,
          JSON.stringify({
            e2eRun: runMarker,
            interests: ["crystals", "exploration"],
          }),
        ],
      );
      await pool.query(
        `INSERT INTO profile.parental_settings
            (household_id,content_boundary,require_parent_approval_for_ai)
           VALUES($1,'strict',false)`,
        [householdId],
      );
      await pool.query(
        `INSERT INTO profile.lumi_characters
            (id,child_profile_id,household_id,name,broad_kind,character_type,subtype,
             origin_mode,first_origin_package_id,origin_concept,starting_region_archetype,
             starting_location,home_archetype,nearby_npc_seed,first_mystery_seed,
             universe_seed,safety_bounds)
           VALUES($1,$2,$3,'Liora','fantasy','explorer','crystal-guardian','manual',$4,
             'Kristal adaları keşfeden meraklı ve nazik bir koruyucu','crystal-islands',
             'moonlit-crystal-cove','crystal-home','wise-owl','singing-crystal',
             'context-e2e-universe',$5::jsonb)`,
        [
          characterId,
          childProfileId,
          householdId,
          firstOriginPackageId,
          JSON.stringify({ childSafe: true }),
        ],
      );
      await pool.query(
        `INSERT INTO profile.worlds
            (id,household_id,child_profile_id,character_id,universe_seed,origin_seed,
             accepted_candidate_seed,generator_version,vector_version,lifecycle_status,metadata)
           VALUES($1,$2,$3,$4,'context-e2e-universe','crystal-origin','crystal-candidate',
             'context-db-production-e2e','v1','active',$5::jsonb)`,
        [
          worldId,
          householdId,
          childProfileId,
          characterId,
          JSON.stringify({
            e2eRun: runMarker,
            worldFact: "Crystal Islands glow softly at night.",
          }),
        ],
      );

      await pool.query(
        `INSERT INTO profile.llm_provider_settings
            (id,user_id,household_id,provider,encrypted_api_key,enabled)
           VALUES($1,$2,$3,'openrouter',$4,true)`,
        [providerSettingId, userId, householdId, encryptedPlaceholderKey],
      );
      await pool.query(
        `INSERT INTO profile.llm_task_model_settings
            (id,user_id,household_id,provider,task_type,model_id,reasoning_level,
             temperature,max_output_tokens,enabled)
           VALUES($1,$2,$3,'openrouter','story_turn_generation',$4,'low',0,900,true)`,
        [
          taskSettingId,
          userId,
          householdId,
          process.env.LUMI_LIVE_LLM_MODEL ?? "deepseek/deepseek-chat-v3-0324",
        ],
      );

      await pool.query(
        `INSERT INTO story.story_definitions
            (id,household_id,child_profile_id,title,slug,story_type,source_type,lifecycle,
             age_group,default_language)
           VALUES($1,$2,$3,'Context Production E2E Story',$4,'interactive','generated',
             'published','6-8','tr-TR')`,
        [storyDefinitionId, householdId, childProfileId, runMarker],
      );
      await pool.query(
        `INSERT INTO story.story_versions
            (id,story_definition_id,version_number,publication_status,title,story_mode,published_at)
           VALUES($1,$2,1,'published','Context Production E2E Story','dynamic',now())`,
        [storyVersionId, storyDefinitionId],
      );
      await pool.query(
        `INSERT INTO story.story_scenes
            (id,story_version_id,scene_key,sequence_number,scene_type,title,narrative_text,
             is_entry_scene,is_terminal_scene,metadata)
           VALUES($1,$2,'entry',0,'narrative','Başlangıç',
             'Liora Kristal Adaların kıyısında güvenli bir patikada ilerliyor.',true,false,$3::jsonb)`,
        [entrySceneId, storyVersionId, JSON.stringify({ e2eRun: runMarker })],
      );
      await pool.query(
        `INSERT INTO story.story_sessions
            (id,household_id,child_profile_id,world_id,story_definition_id,story_version_id,
             current_scene_id,session_status,playback_mode,started_at,last_interacted_at,
             context_snapshot,version)
           VALUES($1,$2,$3,$4,$5,$6,$7,'active','reading',now(),now(),$8::jsonb,1)`,
        [
          sessionId,
          householdId,
          childProfileId,
          worldId,
          storyDefinitionId,
          storyVersionId,
          entrySceneId,
          JSON.stringify({ e2eRun: runMarker }),
        ],
      );
      await pool.query(
        `INSERT INTO story.story_hooks
            (id,household_id,child_profile_id,story_session_id,world_id,opportunity_id,
             hook_type,source_npc_id,payload,constraints,scene_type,status,version)
           VALUES($1,$2,$3,$4,$5,$6,'warning',$7,$8::jsonb,$9::jsonb,
             'narrative','pending',1)`,
        [
          hookId,
          householdId,
          childProfileId,
          sessionId,
          worldId,
          `context-live-${hookId}`,
          sourceNpcId,
          JSON.stringify({
            claim:
              "Ay ışığında parlayan kristallerin arasından gelen nazik sesi araştır.",
          }),
          JSON.stringify({ childSafe: true }),
        ],
      );

      const generated = await generateHookReaderTurn({
        userId,
        householdId,
        sessionId,
        hookId,
        expectedVersion: 1,
      });

      expect(generated.generated).toBe(true);
      expect(generated.reusedPersistedScene).toBe(false);
      expect(generated.sceneId).toBeTruthy();

      const playback = await getSessionPlaybackState(sessionId);
      expect(playback.session.version).toBe(2);
      expect(playback.session.currentSceneId).toBe(generated.sceneId);
      expect(playback.currentScene?.id).toBe(generated.sceneId);
      expect(playback.currentScene?.narrativeText.length ?? 0).toBeGreaterThan(
        20,
      );

      const persisted = await pool.query<{
        scene_key: string;
        narrative_text: string;
        metadata: Record<string, unknown>;
      }>(
        `SELECT scene_key,narrative_text,metadata
             FROM story.story_scenes
            WHERE id=$1 AND story_version_id=$2`,
        [generated.sceneId, storyVersionId],
      );
      expect(persisted.rowCount).toBe(1);
      expect(persisted.rows[0]?.scene_key).toBe(`generated:hook:${hookId}`);
      expect(persisted.rows[0]?.narrative_text.length ?? 0).toBeGreaterThan(20);
      expect(persisted.rows[0]?.metadata?.sourceHookId).toBe(hookId);

      const inspection = await getGenerationInspection({
        householdId,
        storySessionId: sessionId,
        generatedSceneId: generated.sceneId,
      });
      expect(inspection.sourceHookId).toBe(hookId);
      expect(inspection.modelId.length).toBeGreaterThan(0);
      expect(inspection.attempt).toBeGreaterThanOrEqual(1);
      expect(inspection.contextContentHash.length).toBeGreaterThan(10);
      expect(inspection.sections.length).toBeGreaterThan(0);
      expect(inspection.tokenUsage.usedTokens).toBeGreaterThan(0);
      expect(inspection.request.householdId).toBe(householdId);
      expect(inspection.request.childProfileId).toBe(childProfileId);
      expect(inspection.request.worldId).toBe(worldId);
      expect(inspection.request.storySessionId).toBe(sessionId);

      const rawInspection = await pool.query<{
        context_manifest: Record<string, unknown>;
        inspector_projection: Record<string, unknown>;
      }>(
        `SELECT context_manifest,inspector_projection
             FROM story.story_generation_inspections
            WHERE generated_scene_id=$1`,
        [generated.sceneId],
      );
      expect(rawInspection.rowCount).toBe(1);
      expect(rawInspection.rows[0]?.context_manifest).toBeTruthy();
      expect(rawInspection.rows[0]?.inspector_projection).toBeTruthy();

      const consumed = await pool.query<{
        status: string;
        consumed_at: Date | null;
      }>(`SELECT status,consumed_at FROM story.story_hooks WHERE id=$1`, [
        hookId,
      ]);
      expect(consumed.rows[0]?.status).toBe("consumed");
      expect(consumed.rows[0]?.consumed_at).toBeInstanceOf(Date);
    } finally {
      await pool.query(
        `DELETE FROM story.story_generation_inspections WHERE story_session_id=$1`,
        [sessionId],
      );
      await pool.query(
        `DELETE FROM story.story_idempotency_ledger WHERE household_id=$1`,
        [householdId],
      );
      await pool.query(
        `DELETE FROM story.story_event_store WHERE actor_household_id=$1`,
        [householdId],
      );
      await pool.query(
        `DELETE FROM story.story_session_checkpoints WHERE story_session_id=$1`,
        [sessionId],
      );
      await pool.query(
        `DELETE FROM story.story_session_scene_visits WHERE story_session_id=$1`,
        [sessionId],
      );
      await pool.query(`DELETE FROM story.story_hooks WHERE id=$1`, [hookId]);
      await pool.query(`DELETE FROM story.story_sessions WHERE id=$1`, [
        sessionId,
      ]);
      await pool.query(
        `DELETE FROM story.story_scenes WHERE story_version_id=$1`,
        [storyVersionId],
      );
      await pool.query(`DELETE FROM story.story_versions WHERE id=$1`, [
        storyVersionId,
      ]);
      await pool.query(`DELETE FROM story.story_definitions WHERE id=$1`, [
        storyDefinitionId,
      ]);
      await pool.query(`DELETE FROM profile.worlds WHERE id=$1`, [worldId]);
      await pool.query(`DELETE FROM profile.lumi_characters WHERE id=$1`, [
        characterId,
      ]);
      await pool.query(
        `DELETE FROM profile.llm_task_model_settings WHERE id=$1`,
        [taskSettingId],
      );
      await pool.query(
        `DELETE FROM profile.llm_provider_settings WHERE id=$1`,
        [providerSettingId],
      );
      await pool.query(
        `DELETE FROM profile.parental_settings WHERE household_id=$1`,
        [householdId],
      );
      await pool.query(`DELETE FROM profile.child_profiles WHERE id=$1`, [
        childProfileId,
      ]);
      await pool.query(
        `DELETE FROM profile.household_members WHERE household_id=$1 AND user_id=$2`,
        [householdId, userId],
      );
      await pool.query(`DELETE FROM profile.households WHERE id=$1`, [
        householdId,
      ]);
    }
  }, 90_000);
});
