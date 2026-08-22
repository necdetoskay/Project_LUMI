import { createHash } from "node:crypto";
import type pg from "pg";

export type CanonicalNpcFixtureNpc = {
  id: string;
  name: string;
};

export type CanonicalNpcFixtureInput = {
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  fixtureKey: string;
  npcs: readonly CanonicalNpcFixtureNpc[];
};

function stableFixtureUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function seedCanonicalNpcFixture(
  pool: pg.Pool,
  input: CanonicalNpcFixtureInput,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO profile.households (id, name, slug)
       VALUES ($1,$2,$3)
       ON CONFLICT (id) DO NOTHING`,
      [
        input.householdId,
        `Fixture ${input.fixtureKey}`,
        `fixture-${input.fixtureKey}`.slice(0, 120),
      ],
    );

    await client.query(
      `INSERT INTO profile.child_profiles
        (id, household_id, display_name, age_band, locale, metadata)
       VALUES ($1,$2,'Fixture Child','6-8','tr-TR',$3::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [
        input.childProfileId,
        input.householdId,
        JSON.stringify({ fixtureKey: input.fixtureKey }),
      ],
    );

    const childOriginId = stableFixtureUuid(
      `${input.fixtureKey}:child-origin:${input.characterId}`,
    );
    await client.query(
      `INSERT INTO profile.character_origin_packages
        (id, child_profile_id, household_id, broad_kind, character_type, subtype,
         origin_mode, universe_seed, created_by, accepted, payload, generation_source)
       VALUES ($1,$2,$3,'human','explorer','fixture-child','auto',$4,'system',false,$5::jsonb,$6)
       ON CONFLICT (id) DO NOTHING`,
      [
        childOriginId,
        input.childProfileId,
        input.householdId,
        `fixture-universe:${input.fixtureKey}`,
        JSON.stringify({
          originConcept: "Canonical integration-test child identity",
          startingRegionArchetype: "fixture-region",
          startingLocation: "fixture-location",
          homeArchetype: "fixture-home",
          nearbyNpcSeed: "fixture-npcs",
          firstMysterySeed: "fixture-mystery",
          toneVector: [],
          noveltyMarkers: ["canonical_npc_fixture"],
          safetyBounds: {},
        }),
        "canonical_npc_fixture_v1",
      ],
    );

    await client.query(
      `INSERT INTO profile.lumi_characters
        (id, child_profile_id, household_id, name, broad_kind, character_type,
         subtype, origin_mode, first_origin_package_id, origin_concept,
         starting_region_archetype, starting_location, home_archetype,
         nearby_npc_seed, first_mystery_seed, universe_seed, safety_bounds,
         character_subtype, lifecycle_stage, version)
       VALUES ($1,$2,$3,'Fixture Child','human','explorer','fixture-child','auto',$4,
         'Canonical integration-test child identity','fixture-region','fixture-location',
         'fixture-home','fixture-npcs','fixture-mystery',$5,'{}'::jsonb,
         'child_avatar','childhood',1)
       ON CONFLICT (id) DO NOTHING`,
      [
        input.characterId,
        input.childProfileId,
        input.householdId,
        childOriginId,
        `fixture-universe:${input.fixtureKey}`,
      ],
    );

    await client.query(
      `INSERT INTO profile.worlds
        (id, household_id, child_profile_id, character_id, universe_seed, origin_seed,
         accepted_candidate_seed, generator_version, vector_version, lifecycle_status, version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'canonical-fixture-v1','canonical-fixture-v1','active',1)
       ON CONFLICT (id) DO NOTHING`,
      [
        input.worldId,
        input.householdId,
        input.childProfileId,
        input.characterId,
        `fixture-universe:${input.fixtureKey}`,
        `fixture-origin:${input.fixtureKey}`,
        `fixture-candidate:${input.fixtureKey}`,
      ],
    );

    for (const npc of input.npcs) {
      const originId = stableFixtureUuid(
        `${input.fixtureKey}:npc-origin:${npc.id}`,
      );
      await client.query(
        `INSERT INTO profile.character_origin_packages
          (id, child_profile_id, household_id, broad_kind, character_type, subtype,
           origin_mode, universe_seed, created_by, accepted, payload, generation_source)
         VALUES ($1,$2,$3,'human','helper','fixture-npc','auto',$4,'system',false,$5::jsonb,$6)
         ON CONFLICT (id) DO NOTHING`,
        [
          originId,
          input.childProfileId,
          input.householdId,
          `fixture-universe:${input.fixtureKey}`,
          JSON.stringify({
            originConcept: `Canonical fixture NPC ${npc.name}`,
            startingRegionArchetype: "fixture-region",
            startingLocation: "fixture-location",
            homeArchetype: "fixture-home",
            nearbyNpcSeed: "fixture-npcs",
            firstMysterySeed: "fixture-mystery",
            toneVector: [],
            noveltyMarkers: ["canonical_npc_fixture"],
            safetyBounds: {},
          }),
          "canonical_npc_fixture_v1",
        ],
      );

      await client.query(
        `INSERT INTO profile.lumi_characters
          (id, child_profile_id, household_id, name, broad_kind, character_type,
           subtype, origin_mode, first_origin_package_id, origin_concept,
           starting_region_archetype, starting_location, home_archetype,
           nearby_npc_seed, first_mystery_seed, universe_seed, safety_bounds,
           character_subtype, lifecycle_stage, version)
         VALUES ($1,$2,$3,$4,'human','helper','fixture-npc','auto',$5,$6,
           'fixture-region','fixture-location','fixture-home','fixture-npcs','fixture-mystery',
           $7,'{}'::jsonb,'npc','adulthood',1)
         ON CONFLICT (id) DO NOTHING`,
        [
          npc.id,
          input.childProfileId,
          input.householdId,
          npc.name,
          originId,
          `Canonical fixture NPC ${npc.name}`,
          `fixture-universe:${input.fixtureKey}`,
        ],
      );

      await client.query(
        `INSERT INTO profile.world_npcs
          (character_id, character_subtype, world_id, child_profile_id, household_id)
         VALUES ($1,'npc',$2,$3,$4)
         ON CONFLICT (character_id) DO NOTHING`,
        [npc.id, input.worldId, input.childProfileId, input.householdId],
      );
    }

    const canonical = await client.query(
      `SELECT count(*)::int AS count
         FROM profile.world_npcs
        WHERE world_id = $1
          AND child_profile_id = $2
          AND household_id = $3
          AND character_id = ANY($4::uuid[])`,
      [
        input.worldId,
        input.childProfileId,
        input.householdId,
        input.npcs.map((npc) => npc.id),
      ],
    );
    if (canonical.rows[0]?.count !== input.npcs.length) {
      throw new Error("CANONICAL_NPC_FIXTURE_REGISTRY_INCOMPLETE");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
