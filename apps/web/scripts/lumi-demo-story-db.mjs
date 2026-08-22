import pg from "pg";

import { LUMI_DEMO_MANIFEST } from "../../../scripts/demo/lumi-demo-manifest.mjs";

export const LUMI_DEMO_ENTRY_SCENE_ID = "51000000-0000-4000-8000-000000000073";
export const LUMI_DEMO_ENTRY_VISIT_ID = "51000000-0000-4000-8000-000000000074";
export const LUMI_DEMO_CHOICE_POINT_ID = "51000000-0000-4000-8000-000000000075";
export const LUMI_DEMO_FOLLOW_LIGHT_OPTION_ID =
  "51000000-0000-4000-8000-000000000076";
export const LUMI_DEMO_STAY_WITH_MIRA_OPTION_ID =
  "51000000-0000-4000-8000-000000000077";
export const LUMI_DEMO_GROVE_SCENE_ID = "51000000-0000-4000-8000-000000000078";
export const LUMI_DEMO_MIRA_SCENE_ID = "51000000-0000-4000-8000-000000000079";
export const LUMI_DEMO_GROVE_TRANSITION_ID =
  "51000000-0000-4000-8000-000000000080";
export const LUMI_DEMO_MIRA_TRANSITION_ID =
  "51000000-0000-4000-8000-000000000081";

const PLAYABLE_SCENE_IDS = [
  LUMI_DEMO_ENTRY_SCENE_ID,
  LUMI_DEMO_GROVE_SCENE_ID,
  LUMI_DEMO_MIRA_SCENE_ID,
];

export function createLumiDemoStoryPostgresAdapter(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });

  return {
    async inspect(manifest = LUMI_DEMO_MANIFEST) {
      const result = await pool.query(
        `SELECT
           (SELECT count(*)::int
              FROM story.story_definitions
             WHERE id = $1 AND household_id = $4 AND child_profile_id = $5) AS definitions,
           (SELECT count(*)::int
              FROM story.story_versions
             WHERE id = $2 AND story_definition_id = $1) AS versions,
           (SELECT count(*)::int
              FROM story.story_sessions
             WHERE id = $3 AND household_id = $4 AND child_profile_id = $5 AND world_id = $6) AS sessions,
           (SELECT current_scene_id::text
              FROM story.story_sessions
             WHERE id = $3) AS current_scene_id,
           (SELECT session_status
              FROM story.story_sessions
             WHERE id = $3) AS session_status,
           (SELECT count(*)::int
              FROM story.story_scenes
             WHERE story_version_id = $2 AND id = ANY($7::uuid[])) AS playable_scenes,
           (SELECT count(*)::int
              FROM story.story_choice_points
             WHERE id = $8 AND story_version_id = $2 AND scene_id = $9) AS choice_points,
           (SELECT count(*)::int
              FROM story.story_choice_options
             WHERE choice_point_id = $8) AS choice_options`,
        [
          manifest.story.definitionId,
          manifest.story.versionId,
          manifest.story.sessionId,
          manifest.household.id,
          manifest.childProfile.id,
          manifest.world.id,
          PLAYABLE_SCENE_IDS,
          LUMI_DEMO_CHOICE_POINT_ID,
          LUMI_DEMO_ENTRY_SCENE_ID,
        ],
      );
      const row = result.rows[0] ?? {};
      return {
        ready:
          Number(row.definitions ?? 0) === 1 &&
          Number(row.versions ?? 0) === 1 &&
          Number(row.sessions ?? 0) === 1 &&
          Number(row.playable_scenes ?? 0) === PLAYABLE_SCENE_IDS.length &&
          Number(row.choice_points ?? 0) === 1 &&
          Number(row.choice_options ?? 0) === 2 &&
          PLAYABLE_SCENE_IDS.includes(row.current_scene_id),
        definitions: Number(row.definitions ?? 0),
        versions: Number(row.versions ?? 0),
        sessions: Number(row.sessions ?? 0),
        playableScenes: Number(row.playable_scenes ?? 0),
        choicePoints: Number(row.choice_points ?? 0),
        choiceOptions: Number(row.choice_options ?? 0),
        currentSceneId: row.current_scene_id ?? null,
        sessionStatus: row.session_status ?? null,
      };
    },

    async ensure(manifest = LUMI_DEMO_MANIFEST) {
      const before = await this.inspect(manifest);
      if (before.ready) return { outcome: "already_ready", status: before };

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const core = await client.query(
          `SELECT
             EXISTS(SELECT 1 FROM profile.households WHERE id = $1) AS household,
             EXISTS(SELECT 1 FROM profile.child_profiles WHERE id = $2 AND household_id = $1) AS profile,
             EXISTS(SELECT 1 FROM profile.lumi_characters WHERE id = $3 AND household_id = $1) AS character,
             EXISTS(SELECT 1 FROM profile.worlds WHERE id = $4 AND household_id = $1) AS world`,
          [
            manifest.household.id,
            manifest.childProfile.id,
            manifest.character.id,
            manifest.world.id,
          ],
        );
        const coreRow = core.rows[0];
        if (
          !coreRow?.household ||
          !coreRow?.profile ||
          !coreRow?.character ||
          !coreRow?.world
        ) {
          throw new Error("DEMO_STORY_CORE_STATE_REQUIRED");
        }

        await client.query(
          `INSERT INTO story.story_definitions
            (id, household_id, child_profile_id, title, slug, story_type, source_type,
             lifecycle, current_published_version_id, age_group, default_language, version)
           VALUES ($1,$2,$3,$4,$5,'interactive','demo_seed','published',NULL,'6-8','tr-TR',1)
           ON CONFLICT (id) DO NOTHING`,
          [
            manifest.story.definitionId,
            manifest.household.id,
            manifest.childProfile.id,
            manifest.story.title,
            manifest.story.key,
          ],
        );
        await client.query(
          `INSERT INTO story.story_versions
            (id, story_definition_id, version_number, publication_status, schema_version,
             title, summary, story_mode, content_hash, frozen_at, published_at)
           VALUES ($1,$2,1,'published',1,$3,$4,'interactive',$5,NOW(),NOW())
           ON CONFLICT (id) DO NOTHING`,
          [
            manifest.story.versionId,
            manifest.story.definitionId,
            manifest.story.title,
            "Lina'nın Fısıldayan Orman'da Mira ile karşılaşıp kayıp ışık izinin peşine düşmeye başladığı demo hikâyesi.",
            "lumi-demo-story-v2-playable",
          ],
        );
        await client.query(
          `UPDATE story.story_definitions
              SET current_published_version_id = $2,
                  lifecycle = 'published',
                  updated_at = NOW()
            WHERE id = $1`,
          [manifest.story.definitionId, manifest.story.versionId],
        );

        await client.query(
          `INSERT INTO story.story_scenes
            (id, story_version_id, scene_key, sequence_number, scene_type, title,
             narrative_text, is_entry_scene, is_terminal_scene, metadata)
           VALUES ($1,$2,'ilk-isik',0,'narrative',$3,$4,true,false,$5::jsonb)
           ON CONFLICT (id) DO NOTHING`,
          [
            LUMI_DEMO_ENTRY_SCENE_ID,
            manifest.story.versionId,
            "Ormandaki İlk Işık",
            "Lina, Fısıldayan Orman'ın ince patikasında ilerlerken ağaçların arasında tek bir altın ışığın yanıp söndüğünü fark etti. Birkaç adım ötede Mira sessizce bekliyordu. ‘Bu ışık dün burada değildi,’ dedi Mira. ‘Belki de Kayıp Işık İzinin ilk işaretini bulduk.’ Lina, cebindeki Parlayan Pusula'yı hissedip çevresine dikkatle baktı.",
            JSON.stringify({
              lumiDemo: true,
              openingLocationKey: manifest.story.openingLocationKey,
              openingNpcKey: manifest.story.openingNpcKey,
              visualStatus: "not_generated",
            }),
          ],
        );
        await client.query(
          `INSERT INTO story.story_scenes
            (id, story_version_id, scene_key, sequence_number, scene_type, title,
             narrative_text, is_entry_scene, is_terminal_scene, metadata)
           VALUES ($1,$2,'atesbocekleri-izinde',1,'narrative',$3,$4,false,false,$5::jsonb)
           ON CONFLICT (id) DO NOTHING`,
          [
            LUMI_DEMO_GROVE_SCENE_ID,
            manifest.story.versionId,
            "Ateşböceklerinin İzinde",
            "Lina Parlayan Pusula'yı avucunda tutup altın ışığın peşinden yürüdü. Patika onu Ateşböcekleri Korusu'na çıkardı. Tiko çalılıkların arasından başını uzattı; korunun üzerinde daha önce görmediği ince bir ışık yolu beliriyordu. Lina artık kayıp ışığın gerçek bir iz bıraktığını biliyordu.",
            JSON.stringify({
              lumiDemo: true,
              locationKey: "atesbocekleri-korusu",
              visualStatus: "not_generated",
            }),
          ],
        );
        await client.query(
          `INSERT INTO story.story_scenes
            (id, story_version_id, scene_key, sequence_number, scene_type, title,
             narrative_text, is_entry_scene, is_terminal_scene, metadata)
           VALUES ($1,$2,'mira-ile-izleri-okumak',2,'narrative',$3,$4,false,false,$5::jsonb)
           ON CONFLICT (id) DO NOTHING`,
          [
            LUMI_DEMO_MIRA_SCENE_ID,
            manifest.story.versionId,
            "Mira ile İzleri Okumak",
            "Lina hemen ilerlemek yerine Mira'nın yanında kaldı. Birlikte toprağın üzerindeki soluk parıltıları, kırılmış ince dalları ve rüzgârın taşıdığı sıcak kokuyu incelediler. Mira gülümsedi: ‘Bazen doğru yol, önce dikkatle bakınca görünür.’ Lina iz sürmenin yalnız hızlı olmak olmadığını anladı.",
            JSON.stringify({
              lumiDemo: true,
              locationKey: "fisildayan-orman",
              visualStatus: "not_generated",
            }),
          ],
        );

        await client.query(
          `INSERT INTO story.story_scene_transitions
            (id, story_version_id, from_scene_id, to_scene_id, transition_type, priority)
           VALUES ($1,$2,$3,$4,'choice',0)
           ON CONFLICT (id) DO NOTHING`,
          [
            LUMI_DEMO_GROVE_TRANSITION_ID,
            manifest.story.versionId,
            LUMI_DEMO_ENTRY_SCENE_ID,
            LUMI_DEMO_GROVE_SCENE_ID,
          ],
        );
        await client.query(
          `INSERT INTO story.story_scene_transitions
            (id, story_version_id, from_scene_id, to_scene_id, transition_type, priority)
           VALUES ($1,$2,$3,$4,'choice',1)
           ON CONFLICT (id) DO NOTHING`,
          [
            LUMI_DEMO_MIRA_TRANSITION_ID,
            manifest.story.versionId,
            LUMI_DEMO_ENTRY_SCENE_ID,
            LUMI_DEMO_MIRA_SCENE_ID,
          ],
        );

        await client.query(
          `INSERT INTO story.story_choice_points
            (id, story_version_id, scene_id, choice_point_key, choice_point_type,
             prompt_text, sequence_number, rule_version)
           VALUES ($1,$2,$3,'ilk-isik-yolu','single',$4,0,1)
           ON CONFLICT (id) DO NOTHING`,
          [
            LUMI_DEMO_CHOICE_POINT_ID,
            manifest.story.versionId,
            LUMI_DEMO_ENTRY_SCENE_ID,
            "Lina ilk ışık izini nasıl takip etsin?",
          ],
        );
        await client.query(
          `INSERT INTO story.story_choice_options
            (id, choice_point_id, option_key, option_text, sequence_number,
             availability_rule, consequence_previews)
           VALUES ($1,$2,'isigi-takip-et',$3,0,NULL,$4::jsonb)
           ON CONFLICT (id) DO NOTHING`,
          [
            LUMI_DEMO_FOLLOW_LIGHT_OPTION_ID,
            LUMI_DEMO_CHOICE_POINT_ID,
            "Parlayan Pusula ile ışığın peşinden git",
            JSON.stringify([
              {
                consequenceType: "scene_transition",
                previewText: "Işık izini takip ederek koruya doğru ilerlersin.",
                targetKey: "atesbocekleri-izinde",
              },
              {
                consequenceType: "flag_set",
                previewText: "Lina ilk ışık izini cesaretle takip etmiş olur.",
                targetKey: "demo.followed_first_light",
              },
            ]),
          ],
        );
        await client.query(
          `INSERT INTO story.story_choice_options
            (id, choice_point_id, option_key, option_text, sequence_number,
             availability_rule, consequence_previews)
           VALUES ($1,$2,'mira-ile-incele',$3,1,NULL,$4::jsonb)
           ON CONFLICT (id) DO NOTHING`,
          [
            LUMI_DEMO_STAY_WITH_MIRA_OPTION_ID,
            LUMI_DEMO_CHOICE_POINT_ID,
            "Önce Mira ile çevredeki izleri incele",
            JSON.stringify([
              {
                consequenceType: "scene_transition",
                previewText:
                  "Mira ile ipuçlarını okuyarak daha temkinli ilerlersin.",
                targetKey: "mira-ile-izleri-okumak",
              },
              {
                consequenceType: "flag_set",
                previewText:
                  "Lina ilk ışık izinde önce gözlem yapmayı seçmiş olur.",
                targetKey: "demo.studied_first_light",
              },
            ]),
          ],
        );

        await client.query(
          `INSERT INTO story.story_sessions
            (id, household_id, child_profile_id, world_id, story_definition_id,
             story_version_id, current_scene_id, session_status, playback_mode,
             started_at, last_interacted_at, context_snapshot, version)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'active','reading',NOW(),NOW(),$8::jsonb,1)
           ON CONFLICT (id) DO NOTHING`,
          [
            manifest.story.sessionId,
            manifest.household.id,
            manifest.childProfile.id,
            manifest.world.id,
            manifest.story.definitionId,
            manifest.story.versionId,
            LUMI_DEMO_ENTRY_SCENE_ID,
            JSON.stringify({
              lumiDemo: true,
              characterId: manifest.character.id,
              locationKey: manifest.story.openingLocationKey,
              openingNpcKey: manifest.story.openingNpcKey,
            }),
          ],
        );
        await client.query(
          `INSERT INTO story.story_session_characters
            (story_session_id, character_id, child_avatar_id, participation_role, initial_state_snapshot, version)
           VALUES ($1,$2,$2,'protagonist',$3::jsonb,1)
           ON CONFLICT (story_session_id, character_id) DO NOTHING`,
          [
            manifest.story.sessionId,
            manifest.character.id,
            JSON.stringify({
              lumiDemo: true,
              name: manifest.character.displayName,
            }),
          ],
        );
        await client.query(
          `INSERT INTO story.story_session_scene_visits
            (id, story_session_id, scene_id, visit_sequence, visit_reason)
           VALUES ($1,$2,$3,0,'session_start')
           ON CONFLICT (id) DO NOTHING`,
          [
            LUMI_DEMO_ENTRY_VISIT_ID,
            manifest.story.sessionId,
            LUMI_DEMO_ENTRY_SCENE_ID,
          ],
        );
        await client.query(
          `UPDATE profile.quests
              SET story_session_id = $2,
                  updated_at = NOW()
            WHERE id = $1 AND household_id = $3 AND world_id = $4`,
          [
            manifest.quest.id,
            manifest.story.sessionId,
            manifest.household.id,
            manifest.world.id,
          ],
        );

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      const after = await this.inspect(manifest);
      if (!after.ready) throw new Error("DEMO_STORY_POSTCONDITION_FAILED");
      return { outcome: "seeded", status: after };
    },

    async reset(manifest = LUMI_DEMO_MANIFEST) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `UPDATE profile.quests
              SET story_session_id = NULL,
                  updated_at = NOW()
            WHERE household_id = $1 AND world_id = $2 AND story_session_id = $3`,
          [manifest.household.id, manifest.world.id, manifest.story.sessionId],
        );
        await client.query(
          `DELETE FROM story.story_choice_consequences WHERE story_session_id = $1`,
          [manifest.story.sessionId],
        );
        await client.query(
          `DELETE FROM story.story_committed_choices WHERE story_session_id = $1`,
          [manifest.story.sessionId],
        );
        await client.query(
          `DELETE FROM story.story_choice_options WHERE choice_point_id = $1`,
          [LUMI_DEMO_CHOICE_POINT_ID],
        );
        await client.query(
          `DELETE FROM story.story_choice_points WHERE story_version_id = $1`,
          [manifest.story.versionId],
        );
        await client.query(
          `DELETE FROM story.story_session_checkpoints WHERE story_session_id = $1`,
          [manifest.story.sessionId],
        );
        await client.query(
          `DELETE FROM story.story_session_scene_visits WHERE story_session_id = $1`,
          [manifest.story.sessionId],
        );
        await client.query(
          `DELETE FROM story.story_idempotency_ledger WHERE story_session_id = $1`,
          [manifest.story.sessionId],
        );
        await client.query(
          `DELETE FROM story.story_event_store WHERE story_session_id = $1`,
          [manifest.story.sessionId],
        );
        await client.query(
          `DELETE FROM story.story_session_characters WHERE story_session_id = $1`,
          [manifest.story.sessionId],
        );
        await client.query(
          `DELETE FROM story.story_sessions WHERE id = $1 AND household_id = $2`,
          [manifest.story.sessionId, manifest.household.id],
        );
        await client.query(
          `DELETE FROM story.story_scene_transitions WHERE story_version_id = $1`,
          [manifest.story.versionId],
        );
        await client.query(
          `DELETE FROM story.story_scenes WHERE story_version_id = $1`,
          [manifest.story.versionId],
        );
        await client.query(
          `UPDATE story.story_definitions
              SET current_published_version_id = NULL
            WHERE id = $1 AND household_id = $2`,
          [manifest.story.definitionId, manifest.household.id],
        );
        await client.query(
          `DELETE FROM story.story_versions WHERE id = $1 AND story_definition_id = $2`,
          [manifest.story.versionId, manifest.story.definitionId],
        );
        await client.query(
          `DELETE FROM story.story_definitions WHERE id = $1 AND household_id = $2`,
          [manifest.story.definitionId, manifest.household.id],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return { outcome: "reset" };
    },

    async close() {
      await pool.end();
    },
  };
}
