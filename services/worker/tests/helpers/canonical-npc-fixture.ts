import type pg from "pg";

export type WorkerCanonicalNpcFixtureInput = {
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  fixtureKey: string;
  npcs: readonly { id: string; name: string }[];
};

export async function seedWorkerCanonicalNpcFixture(
  pool: pg.Pool,
  input: WorkerCanonicalNpcFixtureInput,
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
        `Worker Fixture ${input.fixtureKey}`,
        `worker-${input.fixtureKey}`.slice(0, 120),
      ],
    );

    await client.query(
      `INSERT INTO profile.child_profiles
        (id, household_id, display_name, age_band, locale, metadata)
       VALUES ($1,$2,'Worker Fixture Child','6-8','tr-TR',$3::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [
        input.childProfileId,
        input.householdId,
        JSON.stringify({ fixtureKey: input.fixtureKey }),
      ],
    );

    const childOriginId = crypto.randomUUID();
    const existingChild = await client.query(
      `SELECT household_id::text, child_profile_id::text, character_subtype
         FROM profile.lumi_characters
        WHERE id = $1`,
      [input.characterId],
    );
    if (existingChild.rowCount === 0) {
      await client.query(
        `INSERT INTO profile.character_origin_packages
          (id, child_profile_id, household_id, broad_kind, character_type, subtype,
           origin_mode, universe_seed, created_by, accepted, payload, generation_source)
         VALUES ($1,$2,$3,'human','explorer','worker-fixture-child','auto',$4,'system',false,$5::jsonb,$6)`,
        [
          childOriginId,
          input.childProfileId,
          input.householdId,
          `worker-universe:${input.fixtureKey}`,
          JSON.stringify({
            originConcept: "Worker canonical fixture child",
            startingRegionArchetype: "worker-region",
            startingLocation: "worker-location",
            homeArchetype: "worker-home",
            nearbyNpcSeed: "worker-npcs",
            firstMysterySeed: "worker-mystery",
            toneVector: [],
            noveltyMarkers: ["worker_canonical_fixture"],
            safetyBounds: {},
          }),
          "worker_canonical_fixture_v1",
        ],
      );
      await client.query(
        `INSERT INTO profile.lumi_characters
          (id, child_profile_id, household_id, name, broad_kind, character_type,
           subtype, origin_mode, first_origin_package_id, origin_concept,
           starting_region_archetype, starting_location, home_archetype,
           nearby_npc_seed, first_mystery_seed, universe_seed, safety_bounds,
           character_subtype, lifecycle_stage, version)
         VALUES ($1,$2,$3,'Worker Fixture Child','human','explorer','worker-fixture-child','auto',$4,
           'Worker canonical fixture child','worker-region','worker-location','worker-home',
           'worker-npcs','worker-mystery',$5,'{}'::jsonb,'child_avatar','childhood',1)`,
        [
          input.characterId,
          input.childProfileId,
          input.householdId,
          childOriginId,
          `worker-universe:${input.fixtureKey}`,
        ],
      );
    } else {
      const row = existingChild.rows[0];
      if (
        row.household_id !== input.householdId ||
        row.child_profile_id !== input.childProfileId ||
        row.character_subtype !== "child_avatar"
      ) {
        throw new Error("WORKER_FIXTURE_CHILD_SCOPE_CONFLICT");
      }
    }

    await client.query(
      `INSERT INTO profile.worlds
        (id, household_id, child_profile_id, character_id, universe_seed, origin_seed,
         accepted_candidate_seed, generator_version, vector_version, lifecycle_status, version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'worker-fixture-v1','worker-fixture-v1','active',1)
       ON CONFLICT (id) DO NOTHING`,
      [
        input.worldId,
        input.householdId,
        input.childProfileId,
        input.characterId,
        `worker-universe:${input.fixtureKey}`,
        `worker-origin:${input.fixtureKey}`,
        `worker-candidate:${input.fixtureKey}`,
      ],
    );

    const world = await client.query(
      `SELECT household_id::text, child_profile_id::text, character_id::text
         FROM profile.worlds WHERE id = $1`,
      [input.worldId],
    );
    if (
      world.rows[0]?.household_id !== input.householdId ||
      world.rows[0]?.child_profile_id !== input.childProfileId ||
      world.rows[0]?.character_id !== input.characterId
    ) {
      throw new Error("WORKER_FIXTURE_WORLD_SCOPE_CONFLICT");
    }

    for (const npc of input.npcs) {
      const existingNpc = await client.query(
        `SELECT household_id::text, child_profile_id::text, character_subtype
           FROM profile.lumi_characters WHERE id = $1`,
        [npc.id],
      );
      if (existingNpc.rowCount === 0) {
        const originId = crypto.randomUUID();
        await client.query(
          `INSERT INTO profile.character_origin_packages
            (id, child_profile_id, household_id, broad_kind, character_type, subtype,
             origin_mode, universe_seed, created_by, accepted, payload, generation_source)
           VALUES ($1,$2,$3,'human','helper','worker-fixture-npc','auto',$4,'system',false,$5::jsonb,$6)`,
          [
            originId,
            input.childProfileId,
            input.householdId,
            `worker-universe:${input.fixtureKey}`,
            JSON.stringify({
              originConcept: `Worker canonical fixture NPC ${npc.name}`,
              startingRegionArchetype: "worker-region",
              startingLocation: "worker-location",
              homeArchetype: "worker-home",
              nearbyNpcSeed: "worker-npcs",
              firstMysterySeed: "worker-mystery",
              toneVector: [],
              noveltyMarkers: ["worker_canonical_fixture"],
              safetyBounds: {},
            }),
            "worker_canonical_fixture_v1",
          ],
        );
        await client.query(
          `INSERT INTO profile.lumi_characters
            (id, child_profile_id, household_id, name, broad_kind, character_type,
             subtype, origin_mode, first_origin_package_id, origin_concept,
             starting_region_archetype, starting_location, home_archetype,
             nearby_npc_seed, first_mystery_seed, universe_seed, safety_bounds,
             character_subtype, lifecycle_stage, version)
           VALUES ($1,$2,$3,$4,'human','helper','worker-fixture-npc','auto',$5,$6,
             'worker-region','worker-location','worker-home','worker-npcs','worker-mystery',
             $7,'{}'::jsonb,'npc','adulthood',1)`,
          [
            npc.id,
            input.childProfileId,
            input.householdId,
            npc.name,
            originId,
            `Worker canonical fixture NPC ${npc.name}`,
            `worker-universe:${input.fixtureKey}`,
          ],
        );
      } else {
        const row = existingNpc.rows[0];
        if (
          row.household_id !== input.householdId ||
          row.child_profile_id !== input.childProfileId ||
          row.character_subtype !== "npc"
        ) {
          throw new Error("WORKER_FIXTURE_NPC_SCOPE_CONFLICT");
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
        `SELECT world_id::text, child_profile_id::text, household_id::text
           FROM profile.world_npcs WHERE character_id = $1`,
        [npc.id],
      );
      if (
        registry.rows[0]?.world_id !== input.worldId ||
        registry.rows[0]?.child_profile_id !== input.childProfileId ||
        registry.rows[0]?.household_id !== input.householdId
      ) {
        throw new Error("WORKER_FIXTURE_NPC_REGISTRY_SCOPE_CONFLICT");
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
