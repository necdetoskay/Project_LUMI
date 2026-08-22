import assert from "node:assert/strict";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.NPC_INTEGRITY_TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("NPC_INTEGRITY_TEST_DATABASE_URL is required");
}

function fixtureId(index) {
  const suffix = String(index + 1).padStart(12, "0");
  return `70000000-0000-4000-8000-${suffix}`;
}

const ids = Array.from({ length: 50 }, (_, index) => fixtureId(index));
const [
  h1,
  h2,
  child1,
  child2,
  avatar1,
  avatar2,
  npc1,
  npc2,
  npc3,
  world1,
  world2,
  region1,
  region2,
  location1,
  location2,
  trace1,
  trace2,
  event1,
  opportunity1,
  opportunity2,
  memory1,
  memory2,
  memory3,
  usage1,
  snapshot1,
  invalidWorld,
  invalidWorldNpc,
  invalidTrace,
  invalidEvent,
  invalidOpportunity,
  invalidBelief,
  invalidMemory,
  invalidUsage,
  invalidSnapshot,
  invalidWorkerDecision,
  originPackage1,
  originPackage2,
  originPackage3,
  originPackage4,
  originPackage5,
] = ids;

const client = new Client({ connectionString: databaseUrl });
let savepointCounter = 0;

async function expectConstraintViolation(label, sql, params, constraintName) {
  savepointCounter += 1;
  const savepoint = `npc_integrity_${savepointCounter}`;
  await client.query(`SAVEPOINT ${savepoint}`);

  let caught;
  try {
    await client.query(sql, params);
  } catch (error) {
    caught = error;
  }

  await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  await client.query(`RELEASE SAVEPOINT ${savepoint}`);

  assert.ok(caught, `${label}: expected a database constraint violation`);
  assert.equal(
    caught.constraint,
    constraintName,
    `${label}: expected constraint ${constraintName}, got ${caught.constraint ?? "unknown"}`,
  );
}

async function insertCharacter({
  id,
  childProfileId,
  householdId,
  name,
  characterSubtype,
  originPackageId,
  universeSeed,
}) {
  await client.query(
    `
      INSERT INTO profile.lumi_characters (
        id,
        child_profile_id,
        household_id,
        name,
        broad_kind,
        character_type,
        subtype,
        origin_mode,
        first_origin_package_id,
        origin_concept,
        starting_region_archetype,
        starting_location,
        home_archetype,
        nearby_npc_seed,
        first_mystery_seed,
        universe_seed,
        character_subtype
      ) VALUES (
        $1, $2, $3, $4,
        'human', 'explorer', 'human', 'auto', $5,
        'integrity-test-origin', 'forest', 'clearing', 'cottage',
        'integrity-test-neighbor', 'integrity-test-mystery', $6, $7
      )
    `,
    [
      id,
      childProfileId,
      householdId,
      name,
      originPackageId,
      universeSeed,
      characterSubtype,
    ],
  );
}

async function insertWorld({ id, householdId, childProfileId, characterId, seed }) {
  await client.query(
    `
      INSERT INTO profile.worlds (
        id,
        household_id,
        child_profile_id,
        character_id,
        universe_seed,
        origin_seed,
        accepted_candidate_seed,
        generator_version,
        vector_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'integrity-test', 'v1')
    `,
    [
      id,
      householdId,
      childProfileId,
      characterId,
      seed,
      `${seed}-origin`,
      `${seed}-candidate`,
    ],
  );
}

await client.connect();

try {
  await client.query("BEGIN");

  await client.query(
    `INSERT INTO profile.households (id, name, slug)
     VALUES ($1, 'Integrity A', 'integrity-a'), ($2, 'Integrity B', 'integrity-b')`,
    [h1, h2],
  );

  await client.query(
    `INSERT INTO profile.child_profiles (id, household_id, display_name, age_band)
     VALUES ($1, $2, 'Child A', '6-8'), ($3, $4, 'Child B', '6-8')`,
    [child1, h1, child2, h2],
  );

  await insertCharacter({
    id: avatar1,
    childProfileId: child1,
    householdId: h1,
    name: "Avatar A",
    characterSubtype: "child_avatar",
    originPackageId: originPackage1,
    universeSeed: "avatar-a-seed",
  });
  await insertCharacter({
    id: avatar2,
    childProfileId: child2,
    householdId: h2,
    name: "Avatar B",
    characterSubtype: "child_avatar",
    originPackageId: originPackage2,
    universeSeed: "avatar-b-seed",
  });
  await insertCharacter({
    id: npc1,
    childProfileId: child1,
    householdId: h1,
    name: "NPC A",
    characterSubtype: "npc",
    originPackageId: originPackage3,
    universeSeed: "npc-a-seed",
  });
  await insertCharacter({
    id: npc2,
    childProfileId: child2,
    householdId: h2,
    name: "NPC B",
    characterSubtype: "npc",
    originPackageId: originPackage4,
    universeSeed: "npc-b-seed",
  });
  await insertCharacter({
    id: npc3,
    childProfileId: child1,
    householdId: h1,
    name: "NPC C",
    characterSubtype: "npc",
    originPackageId: originPackage5,
    universeSeed: "npc-c-seed",
  });

  await insertWorld({
    id: world1,
    householdId: h1,
    childProfileId: child1,
    characterId: avatar1,
    seed: "world-a",
  });
  await insertWorld({
    id: world2,
    householdId: h2,
    childProfileId: child2,
    characterId: avatar2,
    seed: "world-b",
  });

  await client.query(
    `INSERT INTO profile.world_npcs (character_id, world_id, child_profile_id, household_id)
     VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
    [npc1, world1, child1, h1, npc2, world2, child2, h2],
  );

  await client.query(
    `INSERT INTO profile.world_regions (
       id, world_id, region_key, display_name, region_type
     ) VALUES
       ($1, $2, 'region-a', 'Region A', 'forest'),
       ($3, $4, 'region-b', 'Region B', 'forest')`,
    [region1, world1, region2, world2],
  );

  await client.query(
    `INSERT INTO profile.world_locations (
       id, world_id, region_id, location_key, display_name, location_type
     ) VALUES
       ($1, $2, $3, 'location-a', 'Location A', 'clearing'),
       ($4, $5, $6, 'location-b', 'Location B', 'clearing')`,
    [location1, world1, region1, location2, world2, region2],
  );

  await client.query(
    `INSERT INTO npc_intelligence.decision_traces (
       id, npc_id, household_id, seed, selection_reason, content_hash, trace_json, decided_at
     ) VALUES
       ($1, $2, $3, 'seed-a', 'selected safely', $4, '{}', now()),
       ($5, $6, $7, 'seed-b', 'selected safely', $8, '{}', now())`,
    [trace1, npc1, h1, "a".repeat(64), trace2, npc2, h2, "b".repeat(64)],
  );

  await client.query(
    `INSERT INTO npc_intelligence.decision_events (
       id, npc_id, household_id, event_type, trace_id
     ) VALUES ($1, $2, $3, 'NPC_DECISION_MADE', $4)`,
    [event1, npc1, h1, trace1],
  );

  await client.query(
    `INSERT INTO npc_intelligence.opportunity_inbox (
       id, household_id, source_npc_id, child_profile_id, opportunity_type,
       message, idempotency_key, expires_at
     ) VALUES ($1, $2, $3, $4, 'conversation', 'A safe opportunity', 'same-opportunity', now() + interval '1 day')`,
    [opportunity1, h1, npc1, child1],
  );

  await client.query(
    `INSERT INTO npc_intelligence.memories (
       id, household_id, world_id, child_profile_id, owner_type, owner_id,
       kind, summary, salience, confidence, source_type, source_id, effect_key
     ) VALUES
       ($1, $2, $3, $4, 'npc', $5, 'interaction', 'Memory A', 0.8, 0.9, 'story', 'source-a', 'effect-a'),
       ($6, $7, $8, $9, 'npc', $10, 'interaction', 'Memory B', 0.8, 0.9, 'story', 'source-b', 'effect-b')`,
    [memory1, h1, world1, child1, npc1, memory2, h2, world2, child2, npc2],
  );

  await client.query(
    `INSERT INTO npc_intelligence.memory_usages (
       id, household_id, world_id, child_profile_id, owner_type, owner_id,
       memory_id, scene_id
     ) VALUES ($1, $2, $3, $4, 'npc', $5, $6, $7)`,
    [usage1, h1, world1, child1, npc1, memory1, fixtureId(45)],
  );

  await client.query(
    `INSERT INTO npc_intelligence.npc_snapshots (
       id, npc_id, household_id, world_id, child_profile_id, character_id,
       location_id, last_interaction_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
    [snapshot1, npc1, h1, world1, child1, avatar1, location1],
  );

  await expectConstraintViolation(
    "world child/household scope",
    `INSERT INTO profile.worlds (
       id, household_id, child_profile_id, character_id, universe_seed,
       origin_seed, accepted_candidate_seed, generator_version, vector_version
     ) VALUES ($1, $2, $3, $4, 'invalid-world', 'invalid-origin', 'invalid-candidate', 'test', 'v1')`,
    [invalidWorld, h2, child1, avatar2],
    "worlds_child_scope_fk",
  );

  await expectConstraintViolation(
    "canonical NPC world/child scope",
    `INSERT INTO profile.world_npcs (character_id, world_id, child_profile_id, household_id)
     VALUES ($1, $2, $3, $4)`,
    [npc3, world2, child1, h1],
    "world_npcs_world_child_scope_fk",
  );

  await expectConstraintViolation(
    "decision trace NPC/household scope",
    `INSERT INTO npc_intelligence.decision_traces (
       id, npc_id, household_id, seed, selection_reason, content_hash, trace_json, decided_at
     ) VALUES ($1, $2, $3, 'invalid', 'invalid scope', $4, '{}', now())`,
    [invalidTrace, npc1, h2, "c".repeat(64)],
    "npc_decision_traces_npc_household_fk",
  );

  await expectConstraintViolation(
    "decision event trace scope",
    `INSERT INTO npc_intelligence.decision_events (
       id, npc_id, household_id, event_type, trace_id
     ) VALUES ($1, $2, $3, 'NPC_DECISION_MADE', $4)`,
    [invalidEvent, npc2, h2, trace1],
    "npc_decision_events_trace_scope_fk",
  );

  await expectConstraintViolation(
    "opportunity source NPC/child scope",
    `INSERT INTO npc_intelligence.opportunity_inbox (
       id, household_id, source_npc_id, child_profile_id, opportunity_type,
       message, idempotency_key, expires_at
     ) VALUES ($1, $2, $3, $4, 'conversation', 'Invalid scope', 'invalid-scope', now() + interval '1 day')`,
    [invalidOpportunity, h2, npc1, child2],
    "npc_opportunity_source_scope_fk",
  );

  await expectConstraintViolation(
    "belief NPC/world scope",
    `INSERT INTO npc_intelligence.beliefs (
       id, npc_id, household_id, fact_id, claim, confidence, source, world_id
     ) VALUES ($1, $2, $3, 'invalid-fact', 'Invalid world', 0.5, 'observation', $4)`,
    [invalidBelief, npc1, h1, world2],
    "npc_beliefs_npc_world_household_fk",
  );

  await expectConstraintViolation(
    "memory world/child scope",
    `INSERT INTO npc_intelligence.memories (
       id, household_id, world_id, child_profile_id, owner_type, owner_id,
       kind, summary, salience, confidence, source_type, source_id, effect_key
     ) VALUES ($1, $2, $3, $4, 'npc', $5, 'interaction', 'Invalid memory', 0.5, 0.5, 'story', 'invalid', 'invalid-effect')`,
    [invalidMemory, h1, world1, child2, npc1],
    "npc_memories_world_child_household_fk",
  );

  await expectConstraintViolation(
    "memory supersedes same scope",
    `INSERT INTO npc_intelligence.memories (
       id, household_id, world_id, child_profile_id, owner_type, owner_id,
       kind, summary, salience, confidence, source_type, source_id, effect_key,
       supersedes_memory_id
     ) VALUES ($1, $2, $3, $4, 'npc', $5, 'interaction', 'Cross-scope supersede', 0.5, 0.5, 'story', 'invalid', 'effect-c', $6)`,
    [memory3, h2, world2, child2, npc2, memory1],
    "npc_memories_supersedes_scope_fk",
  );

  await expectConstraintViolation(
    "memory usage memory scope",
    `INSERT INTO npc_intelligence.memory_usages (
       id, household_id, world_id, child_profile_id, owner_type, owner_id,
       memory_id, scene_id
     ) VALUES ($1, $2, $3, $4, 'npc', $5, $6, $7)`,
    [invalidUsage, h2, world2, child2, npc2, memory1, fixtureId(46)],
    "npc_memory_usages_memory_scope_fk",
  );

  await expectConstraintViolation(
    "NPC snapshot NPC/world scope",
    `INSERT INTO npc_intelligence.npc_snapshots (
       id, npc_id, household_id, world_id, child_profile_id, character_id,
       location_id, last_interaction_at
     ) VALUES ($1, $2, $3, $4, $5, $6, NULL, now())`,
    [invalidSnapshot, npc1, h2, world2, child2, avatar2],
    "npc_snapshots_npc_world_household_fk",
  );

  await expectConstraintViolation(
    "NPC snapshot location/world scope",
    `UPDATE npc_intelligence.npc_snapshots
     SET location_id = $1
     WHERE id = $2`,
    [location2, snapshot1],
    "npc_snapshots_location_world_fk",
  );

  await expectConstraintViolation(
    "worker decision NPC/world scope",
    `INSERT INTO npc_intelligence.worker_npc_decisions (
       id, household_id, world_id, child_profile_id, npc_id,
       decision_key, result_json, decided_at
     ) VALUES ($1, $2, $3, $4, $5, 'invalid-decision', '{}', now())`,
    [invalidWorkerDecision, h2, world2, child2, npc1],
    "worker_npc_decisions_npc_world_household_fk",
  );

  await expectConstraintViolation(
    "opportunity idempotency",
    `INSERT INTO npc_intelligence.opportunity_inbox (
       id, household_id, source_npc_id, child_profile_id, opportunity_type,
       message, idempotency_key, expires_at
     ) VALUES ($1, $2, $3, $4, 'conversation', 'Duplicate opportunity', 'same-opportunity', now() + interval '1 day')`,
    [opportunity2, h1, npc1, child1],
    "opp_inbox_idempotency_idx",
  );

  console.warn("NPC referential integrity database self-test OK");
  await client.query("ROLLBACK");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
