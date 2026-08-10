import pg from "pg";

import { LUMI_DEMO_MANIFEST } from "../../../scripts/demo/lumi-demo-manifest.mjs";

export const LUMI_DEMO_ENTRY_SCENE_ID = "51000000-0000-4000-8000-000000000073";
export const LUMI_DEMO_ENTRY_VISIT_ID = "51000000-0000-4000-8000-000000000074";

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
             WHERE id = $7 AND story_version_id = $2 AND is_entry_scene = true) AS entry_scenes`,
        [
          manifest.story.definitionId,
          manifest.story.versionId,
          manifest.story.sessionId,
          manifest.household.id,
          manifest.childProfile.id,
          manifest.world.id,
          LUMI_DEMO_ENTRY_SCENE_ID,
        ],
      );
      const row = result.rows[0] ?? {};
      return {
        ready:
          Number(row.definitions ?? 0) === 1 &&
          Number(row.versions ?? 0) === 1 &&
          Number(row.sessions ?? 0) === 1 &&
          Number(row.entry_scenes ?? 0) === 1 &&
          row.current_scene_id === LUMI_DEMO_ENTRY_SCENE_ID,
        definitions: Number(row.definitions ?? 0),
        versions: Number(row.versions ?? 0),
        sessions: Number(row.sessions ?? 0),
        entryScenes: Number(row.entry_scenes ?? 0),
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
            "lumi-demo-story-v1",
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
            (story_session_id, character_id, participation_role, initial_state_snapshot, version)
           VALUES ($1,$2,'protagonist',$3::jsonb,1)
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
          `DELETE FROM story.story_session_scene_visits WHERE story_session_id = $1`,
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
