import pg from "pg";

import { LUMI_DEMO_MANIFEST } from "../../../scripts/demo/lumi-demo-manifest.mjs";

const CONNECTION_IDS = [
  "51000000-0000-4000-8000-000000000025",
  "51000000-0000-4000-8000-000000000026",
  "51000000-0000-4000-8000-000000000027",
  "51000000-0000-4000-8000-000000000028",
];
const FIRST_ORIGIN_PACKAGE_ID = "51000000-0000-4000-8000-000000000005";
const INVENTORY_ID = "51000000-0000-4000-8000-000000000042";
const INVENTORY_DEFINITION_IDS = [
  "51000000-0000-4000-8000-000000000043",
  "51000000-0000-4000-8000-000000000044",
];
const INVENTORY_ENTRY_IDS = [
  "51000000-0000-4000-8000-000000000045",
  "51000000-0000-4000-8000-000000000046",
];
const INVENTORY_OWNERSHIP_IDS = [
  "51000000-0000-4000-8000-000000000047",
  "51000000-0000-4000-8000-000000000048",
];

function locationByKey(manifest, key) {
  const location = manifest.locations.find((entry) => entry.key === key);
  if (!location) throw new Error(`DEMO_LOCATION_NOT_FOUND:${key}`);
  return location;
}

function regionByKey(manifest, key) {
  const region = manifest.regions.find((entry) => entry.key === key);
  if (!region) throw new Error(`DEMO_REGION_NOT_FOUND:${key}`);
  return region;
}

function npcByKey(manifest, key) {
  const npc = manifest.npcs.find((entry) => entry.key === key);
  if (!npc) throw new Error(`DEMO_NPC_NOT_FOUND:${key}`);
  return npc;
}

export function createLumiDemoPostgresAdapter(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });

  return {
    async inspect(manifest = LUMI_DEMO_MANIFEST) {
      const household = await pool.query(
        `SELECT id::text, slug
           FROM profile.households
          WHERE id = $1 OR slug = $2
          ORDER BY id`,
        [manifest.household.id, manifest.household.key],
      );
      if (household.rowCount === 0) {
        return {
          exists: false,
          householdId: manifest.household.id,
          householdKey: manifest.household.key,
          manifestVersion: null,
          counts: {},
        };
      }
      if (household.rowCount !== 1) throw new Error("DEMO_SCOPE_COLLISION");

      const row = household.rows[0];
      const details = await pool.query(
        `SELECT
           (SELECT metadata->>'lumiDemoManifestVersion'
              FROM profile.child_profiles WHERE id = $1) AS manifest_version,
           (SELECT count(*)::int FROM profile.child_profiles WHERE household_id = $2) AS profiles,
           (SELECT count(*)::int FROM profile.lumi_characters WHERE household_id = $2) AS characters,
           (SELECT count(*)::int FROM profile.worlds WHERE household_id = $2) AS worlds,
           (SELECT count(*)::int FROM profile.inventory_item_instances WHERE household_id = $2) AS inventory_items,
           (SELECT count(*)::int FROM npc_intelligence.npc_snapshots WHERE household_id = $2 AND world_id = $4) AS npcs,
           (SELECT count(*)::int FROM npc_intelligence.memories WHERE household_id = $2 AND world_id = $4) AS memories,
           (SELECT count(*)::int FROM profile.quests WHERE household_id = $2 AND world_id = $4) AS quests,
           (SELECT wl.location_key
              FROM profile.world_character_locations wcl
              JOIN profile.world_locations wl ON wl.id = wcl.location_id
             WHERE wcl.character_id = $3 AND wcl.world_id = $4) AS current_location_key`,
        [
          manifest.childProfile.id,
          manifest.household.id,
          manifest.character.id,
          manifest.world.id,
        ],
      );
      const detail = details.rows[0] ?? {};
      return {
        exists: true,
        householdId: row.id,
        householdKey: row.slug,
        manifestVersion: detail.manifest_version ?? null,
        counts: {
          profiles: Number(detail.profiles ?? 0),
          characters: Number(detail.characters ?? 0),
          worlds: Number(detail.worlds ?? 0),
          inventoryItems: Number(detail.inventory_items ?? 0),
          npcs: Number(detail.npcs ?? 0),
          memories: Number(detail.memories ?? 0),
          quests: Number(detail.quests ?? 0),
        },
        currentLocationKey: detail.current_location_key ?? null,
      };
    },

    async seed(manifest = LUMI_DEMO_MANIFEST) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO profile.households (id, name, slug)
           VALUES ($1,$2,$3)`,
          [
            manifest.household.id,
            manifest.household.displayName,
            manifest.household.key,
          ],
        );
        await client.query(
          `INSERT INTO profile.child_profiles
            (id, household_id, display_name, age_band, locale, metadata)
           VALUES ($1,$2,$3,'6-8',$4,$5::jsonb)`,
          [
            manifest.childProfile.id,
            manifest.household.id,
            manifest.childProfile.displayName,
            manifest.locale,
            JSON.stringify({
              lumiDemoManifestVersion: manifest.manifestVersion,
              lumiDemoKey: manifest.childProfile.key,
              age: manifest.childProfile.age,
              interests: manifest.childProfile.interests,
            }),
          ],
        );
        await client.query(
          `INSERT INTO profile.child_preferences
            (child_profile_id, story_length, interaction_level, image_enabled, audio_enabled, metadata)
           VALUES ($1,'medium',3,true,false,$2::jsonb)`,
          [manifest.childProfile.id, JSON.stringify({ lumiDemo: true })],
        );
        await client.query(
          `INSERT INTO profile.parental_settings
            (household_id, max_daily_stories, content_boundary, require_parent_approval_for_ai,
             allow_image_generation, allow_tts, safety_metadata)
           VALUES ($1,5,'strict',false,true,true,$2::jsonb)`,
          [manifest.household.id, JSON.stringify({ lumiDemo: true })],
        );
        await client.query(
          `INSERT INTO profile.lumi_characters
            (id, child_profile_id, household_id, name, broad_kind, character_type,
             subtype, origin_mode, first_origin_package_id, origin_concept,
             starting_region_archetype, starting_location, home_archetype,
             nearby_npc_seed, first_mystery_seed, universe_seed, safety_bounds,
             character_subtype, lifecycle_stage, version)
           VALUES
            ($1,$2,$3,$4,'human','explorer','child','auto',$5,$6,
             'forest',$7,'cottage','mira','kayip-isik-izi',$8,
             $9::jsonb,'child_avatar','childhood',1)`,
          [
            manifest.character.id,
            manifest.childProfile.id,
            manifest.household.id,
            manifest.character.displayName,
            FIRST_ORIGIN_PACKAGE_ID,
            manifest.character.originKey,
            manifest.world.startLocationKey,
            manifest.world.universeSeed,
            JSON.stringify({
              lumiDemo: true,
              visualCanonStatus: manifest.character.visualCanonStatus,
            }),
          ],
        );
        await client.query(
          `INSERT INTO profile.worlds
            (id, household_id, child_profile_id, character_id, universe_seed, origin_seed,
             accepted_candidate_seed, generator_version, vector_version, lifecycle_status, version)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',1)`,
          [
            manifest.world.id,
            manifest.household.id,
            manifest.childProfile.id,
            manifest.character.id,
            manifest.world.universeSeed,
            manifest.world.originSeed,
            manifest.world.acceptedCandidateSeed,
            manifest.world.generatorVersion,
            manifest.world.vectorVersion,
          ],
        );

        for (const region of manifest.regions) {
          await client.query(
            `INSERT INTO profile.world_regions
              (id, world_id, region_key, display_name, region_type, accessibility_status,
               discovery_status, sort_order, version)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1)`,
            [
              region.id,
              manifest.world.id,
              region.key,
              region.displayName,
              region.type,
              region.accessibilityStatus,
              region.discoveryStatus,
              region.sortOrder,
            ],
          );
        }

        for (const location of manifest.locations) {
          const region = regionByKey(manifest, location.regionKey);
          await client.query(
            `INSERT INTO profile.world_locations
              (id, world_id, region_id, location_key, display_name, accessibility_status,
               location_type, occupancy_level, safety_level, is_home, version)
             VALUES ($1,$2,$3,$4,$5,$6,'custom','empty','safe',$7,1)`,
            [
              location.id,
              manifest.world.id,
              region.id,
              location.key,
              location.displayName,
              location.accessibilityStatus,
              location.isHome,
            ],
          );
        }

        for (const [index, connection] of manifest.connections.entries()) {
          const from = locationByKey(manifest, connection.from);
          const to = locationByKey(manifest, connection.to);
          await client.query(
            `INSERT INTO profile.world_location_connections
              (id, world_id, from_location_id, to_location_id, connection_type,
               traversal_cost, is_bidirectional, version)
             VALUES ($1,$2,$3,$4,$5,1,true,1)`,
            [
              CONNECTION_IDS[index],
              manifest.world.id,
              from.id,
              to.id,
              connection.type,
            ],
          );
        }

        const start = locationByKey(manifest, manifest.world.startLocationKey);
        await client.query(
          `INSERT INTO profile.world_character_locations
            (character_id, world_id, location_id, version)
           VALUES ($1,$2,$3,1)`,
          [manifest.character.id, manifest.world.id, start.id],
        );

        await client.query(
          `INSERT INTO profile.inventory_inventories
            (id, household_id, owner_type, owner_id, inventory_type, display_name, metadata)
           VALUES ($1,$2,'character',$3,'personal',$4,$5::jsonb)`,
          [
            INVENTORY_ID,
            manifest.household.id,
            manifest.character.id,
            `${manifest.character.displayName}'nın Eşyaları`,
            JSON.stringify({ lumiDemo: true }),
          ],
        );

        for (const [index, item] of manifest.inventory.entries()) {
          await client.query(
            `INSERT INTO profile.inventory_item_definitions
              (id, definition_key, display_name, description, category, item_type, rarity,
               stack_mode, durability_mode, is_transferable, is_equippable, is_consumable,
               is_story_selectable, allowed_owner_types, metadata)
             VALUES ($1,$2,$3,$4,'story','keepsake','common','single','none',true,false,false,true,
                     '["character"]'::jsonb,$5::jsonb)`,
            [
              INVENTORY_DEFINITION_IDS[index],
              `lumi-demo-${item.key}`,
              item.displayName,
              item.description,
              JSON.stringify({ lumiDemo: true, demoKey: item.key }),
            ],
          );
          await client.query(
            `INSERT INTO profile.inventory_item_instances
              (id, household_id, item_definition_id, instance_name, quantity, custom_properties,
               origin_type, origin_id)
             VALUES ($1,$2,$3,$4,1,$5::jsonb,'bootstrap',$6)`,
            [
              item.id,
              manifest.household.id,
              INVENTORY_DEFINITION_IDS[index],
              item.displayName,
              JSON.stringify({ lumiDemo: true }),
              manifest.character.id,
            ],
          );
          await client.query(
            `INSERT INTO profile.inventory_entries
              (id, inventory_id, item_instance_id, sort_order, quantity, metadata)
             VALUES ($1,$2,$3,$4,1,$5::jsonb)`,
            [
              INVENTORY_ENTRY_IDS[index],
              INVENTORY_ID,
              item.id,
              index,
              JSON.stringify({ lumiDemo: true }),
            ],
          );
          await client.query(
            `INSERT INTO profile.inventory_ownerships
              (id, item_instance_id, owner_type, owner_id, ownership_type, status,
               source_type, source_id, metadata)
             VALUES ($1,$2,'character',$3,'owned','active','bootstrap',$4,$5::jsonb)`,
            [
              INVENTORY_OWNERSHIP_IDS[index],
              item.id,
              manifest.character.id,
              manifest.world.id,
              JSON.stringify({ lumiDemo: true }),
            ],
          );
        }

        for (const npc of manifest.npcs) {
          const location = locationByKey(manifest, npc.locationKey);
          await client.query(
            `INSERT INTO npc_intelligence.npc_snapshots
              (id, npc_id, household_id, world_id, child_profile_id, character_id, location_id,
               need_types, relationship_to_character, decision_payload, last_interaction_at)
             VALUES ($1,$1,$2,$3,$4,$5,$6,'[]'::jsonb,$7,NULL,NOW())`,
            [
              npc.id,
              manifest.household.id,
              manifest.world.id,
              manifest.childProfile.id,
              manifest.character.id,
              location.id,
              npc.relationshipToCharacter,
            ],
          );
        }

        for (const memory of manifest.memories) {
          const npc = npcByKey(manifest, memory.npcKey);
          await client.query(
            `INSERT INTO npc_intelligence.memories
              (id, household_id, world_id, child_profile_id, owner_type, owner_id, kind,
               summary, salience, confidence, source_type, source_id, effect_key, provenance,
               lifecycle, last_reinforced_at)
             VALUES ($1,$2,$3,$4,'npc',$5,$6,$7,$8,1,'bootstrap',$9,$10,$11::jsonb,$12,NOW())`,
            [
              memory.id,
              manifest.household.id,
              manifest.world.id,
              manifest.childProfile.id,
              npc.id,
              memory.kind,
              memory.summary,
              memory.salience,
              `lumi-demo:${memory.key}`,
              `lumi-demo:${memory.key}`,
              JSON.stringify([{ type: "demo_reference", key: memory.key }]),
              memory.durable ? "durable" : "decaying",
            ],
          );
        }

        await client.query(
          `INSERT INTO profile.quests
            (id, household_id, world_id, story_session_id, title, summary, status,
             evidence_ref, version)
           VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,1)`,
          [
            manifest.quest.id,
            manifest.household.id,
            manifest.world.id,
            manifest.quest.title,
            manifest.quest.summary,
            manifest.quest.status,
            `lumi-demo:${manifest.quest.key}`,
          ],
        );
        await client.query("COMMIT");
        return {
          householdId: manifest.household.id,
          worldId: manifest.world.id,
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async reset(manifest = LUMI_DEMO_MANIFEST) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `DELETE FROM npc_intelligence.memories WHERE household_id = $1 AND world_id = $2`,
          [manifest.household.id, manifest.world.id],
        );
        await client.query(
          `DELETE FROM npc_intelligence.worker_npc_decisions WHERE household_id = $1 AND world_id = $2`,
          [manifest.household.id, manifest.world.id],
        );
        await client.query(
          `DELETE FROM npc_intelligence.npc_snapshots WHERE household_id = $1 AND world_id = $2`,
          [manifest.household.id, manifest.world.id],
        );
        await client.query(
          `DELETE FROM profile.quests WHERE household_id = $1 AND world_id = $2`,
          [manifest.household.id, manifest.world.id],
        );
        await client.query(
          `DELETE FROM profile.inventory_inventories WHERE id = $1 AND household_id = $2`,
          [INVENTORY_ID, manifest.household.id],
        );
        await client.query(
          `DELETE FROM profile.inventory_ownerships WHERE item_instance_id = ANY($1::uuid[])`,
          [manifest.inventory.map((item) => item.id)],
        );
        await client.query(
          `DELETE FROM profile.inventory_item_instances WHERE household_id = $1 AND id = ANY($2::uuid[])`,
          [manifest.household.id, manifest.inventory.map((item) => item.id)],
        );
        await client.query(
          `DELETE FROM profile.inventory_item_definitions WHERE id = ANY($1::uuid[])`,
          [INVENTORY_DEFINITION_IDS],
        );
        await client.query(
          `DELETE FROM profile.worlds WHERE id = $1 AND household_id = $2`,
          [manifest.world.id, manifest.household.id],
        );
        await client.query(
          `DELETE FROM profile.lumi_characters WHERE id = $1 AND household_id = $2`,
          [manifest.character.id, manifest.household.id],
        );
        await client.query(
          `DELETE FROM profile.child_profiles WHERE id = $1 AND household_id = $2`,
          [manifest.childProfile.id, manifest.household.id],
        );
        const result = await client.query(
          `DELETE FROM profile.households WHERE id = $1 AND slug = $2`,
          [manifest.household.id, manifest.household.key],
        );
        await client.query("COMMIT");
        return { deletedHouseholds: result.rowCount ?? 0 };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async close() {
      await pool.end();
    },
  };
}
