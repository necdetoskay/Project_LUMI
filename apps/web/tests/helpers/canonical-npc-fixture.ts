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

    const childProfile = await client.query(
      `SELECT household_id::text
         FROM profile.child_profiles
        WHERE id = $1`,
      [input.childProfileId],
    );
    if (childProfile.rows[0]?.household_id !== input.householdId) {
      throw new Error("CANONICAL_NPC_FIXTURE_CHILD_SCOPE_CONFLICT");
    }

    const existingChildAvatar = await client.query(
      `SELECT household_id::text, child_profile_id::text, character_subtype
         FROM profile.lumi_characters
        WHERE id = $1`,
      [input.characterId],
    );
    if (existingChildAvatar.rowCount === 0) {
      const childOriginId = stableFixtureUuid(
        `${input.fixtureKey}:child-origin:${input.characterId}`,
      );
      await client.query(
        `INSERT INTO profile.character_origin_packages
          (id, child_profile_id, household_id, broad_kind, character_type, subtype,
           origin_mode, universe_seed, created_by, accepted, payload, generation_source)
         VALUES ($1,$2,$3,'human','explorer','fixture-child','auto',$4,'system',false,$5::jsonb,$6)`,
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
           'child_avatar','childhood',1)`,
        [
          input.characterId,
          input.childProfileId,
          input.householdId,
          childOriginId,
          `fixture-universe:${input.fixtureKey}`,
        ],
      );
    } else {
      const row = existingChildAvatar.rows[0];
      if (
        row.household_id !== input.householdId ||
        row.child_profile_id !== input.childProfileId ||
        row.character_subtype !== "child_avatar"
      ) {
        throw new Error("CANONICAL_NPC_FIXTURE_AVATAR_SCOPE_CONFLICT");
      }
    }

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

    const world = await client.query(
      `SELECT household_id::text, child_profile_id::text, character_id::text
         FROM profile.worlds
        WHERE id = $1`,
      [input.worldId],
    );
    if (
      world.rows[0]?.household_id !== input.householdId ||
      world.rows[0]?.child_profile_id !== input.childProfileId ||
      world.rows[0]?.character_id !== input.characterId
    ) {
      throw new Error("CANONICAL_NPC_FIXTURE_WORLD_SCOPE_CONFLICT");
    }

    for (const npc of input.npcs) {
      const existingNpc = await client.query(
        `SELECT household_id::text, child_profile_id::text, character_subtype
           FROM profile.lumi_characters
          WHERE id = $1`,
        [npc.id],
      );
      if (existingNpc.rowCount === 0) {
        const originId = stableFixtureUuid(
          `${input.fixtureKey}:npc-origin:${npc.id}`,
        );
        await client.query(
          `INSERT INTO profile.character_origin_packages
            (id, child_profile_id, household_id, broad_kind, character_type, subtype,
             origin_mode, universe_seed, created_by, accepted, payload, generation_source)
           VALUES ($1,$2,$3,'human','helper','fixture-npc','auto',$4,'system',false,$5::jsonb,$6)`,
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
             $7,'{}'::jsonb,'npc','adulthood',1)`,
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
      } else {
        const row = existingNpc.rows[0];
        if (
          row.household_id !== input.householdId ||
          row.child_profile_id !== input.childProfileId ||
          row.character_subtype !== "npc"
        ) {
          throw new Error("CANONICAL_NPC_FIXTURE_NPC_SCOPE_CONFLICT");
        }
      }

      await client.query(
        `INSERT INTO profile.world_npcs
          (character_id, character_subtype, world_id, child_profile_id, household_id)
         VALUES ($1,'npc',$2,$3,$4)
         ON CONFLICT (character_id) DO NOTHING`,
        [npc.id, input.worldId, input.childProfileId, input.householdId],
      );

      const registry = await client.query(
        `SELECT world_id::text, child_profile_id::text, household_id::text, character_subtype
           FROM profile.world_npcs
          WHERE character_id = $1`,
        [npc.id],
      );
      const row = registry.rows[0];
      if (
        row?.world_id !== input.worldId ||
        row?.child_profile_id !== input.childProfileId ||
        row?.household_id !== input.householdId ||
        row?.character_subtype !== "npc"
      ) {
        throw new Error("CANONICAL_NPC_FIXTURE_REGISTRY_SCOPE_CONFLICT");
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
