import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  __setTestChoiceDb,
  commitChoice,
  getChoiceHistory,
  listConsequencesBySession,
} from "../../src/application/choice/choice.service";
import { createDatabase } from "../../src/db/client";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";
import { cleanupStoryFixture, seedStoryFixture } from "./ultef-fixtures";

const enabled = process.env.ULTEF_SCENARIO === "L4-CHOICE-DIVERGENCE-001";
const databaseUrl = process.env.DATABASE_URL;
const describeDb = enabled && databaseUrl ? describe : describe.skip;

const ids = {
  householdId: crypto.randomUUID(),
  childProfileId: crypto.randomUUID(),
  characterId: crypto.randomUUID(),
  worldId: crypto.randomUUID(),
  storyDefinitionId: crypto.randomUUID(),
  storyVersionId: crypto.randomUUID(),
  entrySceneId: crypto.randomUUID(),
  storySessionId: crypto.randomUUID(),
};

const secondSessionId = crypto.randomUUID();
const choicePointId = crypto.randomUUID();
const optionAId = crypto.randomUUID();
const optionBId = crypto.randomUUID();
let pool: pg.Pool | null = null;

async function readCommittedOption(db: pg.Pool, sessionId: string) {
  const result = await db.query<{
    option_id: string;
    payload: { optionId?: string } | null;
    event_option_id: string | null;
  }>(
    `SELECT cc.option_id,
            c.payload,
            e.payload->>'optionId' AS event_option_id
       FROM story.story_committed_choices cc
       JOIN story.story_choice_consequences c
         ON c.committed_choice_id = cc.id
       LEFT JOIN story.story_event_store e
         ON e.story_session_id = cc.story_session_id
        AND e.event_type = 'STORY_CHOICE_COMMITTED'
      WHERE cc.story_session_id = $1
        AND cc.choice_point_id = $2
      LIMIT 1`,
    [sessionId, choicePointId],
  );
  return result.rows[0] ?? null;
}

describeDb("ULTEF Sprint 01 — choice branch divergence", () => {
  beforeAll(async () => {
    if (!databaseUrl) return;
    pool = new pg.Pool({ connectionString: databaseUrl });
    await seedStoryFixture(pool, ids);
    __setTestChoiceDb(createDatabase(databaseUrl));

    await pool.query(
      `INSERT INTO story.story_choice_points (
         id, story_version_id, scene_id, choice_point_key, choice_point_type,
         prompt_text, sequence_number, rule_version
       ) VALUES ($1, $2, $3, 'bridge-path', 'single',
         'Arin eski koprude ne yapmali?', 0, 1)`,
      [choicePointId, ids.storyVersionId, ids.entrySceneId],
    );
    await pool.query(
      `INSERT INTO story.story_choice_options (
         id, choice_point_id, option_key, option_text, sequence_number,
         availability_rule, consequence_previews
       ) VALUES
         ($1, $3, 'ask-mira', 'Mira\'ya isiklari sor', 0, NULL, '[]'::jsonb),
         ($2, $3, 'follow-lights', 'Isiklari sessizce takip et', 1, NULL, '[]'::jsonb)`,
      [optionAId, optionBId, choicePointId],
    );
  });

  afterAll(async () => {
    if (!pool) return;
    __setTestChoiceDb(undefined);
    await pool.query(
      `DELETE FROM story.story_idempotency_ledger
        WHERE story_session_id IN ($1, $2)`,
      [ids.storySessionId, secondSessionId],
    );
    await pool.query(
      `DELETE FROM story.story_event_store
        WHERE story_session_id IN ($1, $2)`,
      [ids.storySessionId, secondSessionId],
    );
    await pool.query(
      `DELETE FROM story.story_choice_consequences
        WHERE story_session_id IN ($1, $2)`,
      [ids.storySessionId, secondSessionId],
    );
    await pool.query(
      `DELETE FROM story.story_committed_choices
        WHERE story_session_id IN ($1, $2)`,
      [ids.storySessionId, secondSessionId],
    );
    await pool.query(`DELETE FROM story.story_sessions WHERE id = $1`, [
      secondSessionId,
    ]);
    await pool.query(
      `DELETE FROM story.story_choice_options WHERE choice_point_id = $1`,
      [choicePointId],
    );
    await pool.query(`DELETE FROM story.story_choice_points WHERE id = $1`, [
      choicePointId,
    ]);
    await cleanupStoryFixture(pool, ids);
    await pool.end();
  });

  it("L4-CHOICE-DIVERGENCE-001 persists different branches without cross-session contamination", async () => {
    if (!pool) throw new Error("DATABASE_URL_REQUIRED");

    const scenario = createScenario({
      id: "L4-CHOICE-DIVERGENCE-001",
      title: "Equivalent story starts preserve distinct choice branches",
      level: "L4",
      projectGate: "PX-LUMI-01",
      seed: "runtime-uuid",
    });
    scenario.setup("Child", { id: ids.childProfileId, name: "Deniz" });
    scenario.setup("Character", { id: ids.characterId, name: "Arin" });
    scenario.setup("World", { id: ids.worldId, name: "Gunes Vadisi" });
    scenario.setup("Choice", {
      prompt: "Arin eski koprude ne yapmali?",
      optionA: "Mira'ya isiklari sor",
      optionB: "Isiklari sessizce takip et",
    });

    await commitChoice({
      storySessionId: ids.storySessionId,
      choicePointId,
      optionId: optionAId,
      evidenceSceneId: ids.entrySceneId,
      idempotencyKey: `ultef-choice-a:${ids.storySessionId}`,
    });
    const branchA = await readCommittedOption(pool, ids.storySessionId);

    await pool.query(
      `UPDATE story.story_sessions
          SET session_status = 'completed', last_interacted_at = NOW()
        WHERE id = $1`,
      [ids.storySessionId],
    );
    await pool.query(
      `INSERT INTO story.story_sessions (
         id, household_id, child_profile_id, world_id, story_definition_id,
         story_version_id, current_scene_id, session_status, playback_mode,
         started_at, last_interacted_at, context_snapshot, version
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 'reading', NOW(), NOW(), '{}'::jsonb, 1)`,
      [
        secondSessionId,
        ids.householdId,
        ids.childProfileId,
        ids.worldId,
        ids.storyDefinitionId,
        ids.storyVersionId,
        ids.entrySceneId,
      ],
    );

    await commitChoice({
      storySessionId: secondSessionId,
      choicePointId,
      optionId: optionBId,
      evidenceSceneId: ids.entrySceneId,
      idempotencyKey: `ultef-choice-b:${secondSessionId}`,
    });
    const branchB = await readCommittedOption(pool, secondSessionId);

    const historyA = await getChoiceHistory(ids.storySessionId);
    const historyB = await getChoiceHistory(secondSessionId);
    const consequencesA = await listConsequencesBySession(ids.storySessionId);
    const consequencesB = await listConsequencesBySession(secondSessionId);

    scenario.event(
      "choice.branch-a",
      "Ilk session'da Arin Mira'ya kopru isiklarini sormayi secti ve bu secim kendi consequence/event kayitlariyla persist edildi.",
    );
    scenario.event(
      "choice.branch-b",
      "Ilk session tamamlandiktan sonra ayni cocuk, dunya, hikaye ve baslangic sahnesiyle yeni session acildi; Arin bu kez isiklari takip etmeyi secti.",
    );
    scenario.event(
      "choice.reload",
      "Her iki session'in choice history, consequence payload ve story event option kimlikleri PostgreSQL'den yeniden okundu.",
    );

    const assertions = {
      branchASelectedA:
        branchA?.option_id === optionAId &&
        branchA.payload?.optionId === optionAId &&
        branchA.event_option_id === optionAId,
      branchBSelectedB:
        branchB?.option_id === optionBId &&
        branchB.payload?.optionId === optionBId &&
        branchB.event_option_id === optionBId,
      historiesDiverge:
        historyA.length === 1 &&
        historyB.length === 1 &&
        historyA[0]?.optionId === optionAId &&
        historyB[0]?.optionId === optionBId,
      oneConsequencePerBranch:
        consequencesA.length === 1 && consequencesB.length === 1,
      noCrossContamination:
        branchA?.option_id !== optionBId && branchB?.option_id !== optionAId,
    };

    scenario.assert(
      "Branch A persisted only option A",
      assertions.branchASelectedA,
      optionAId,
      branchA,
    );
    scenario.assert(
      "Branch B persisted only option B",
      assertions.branchBSelectedB,
      optionBId,
      branchB,
    );
    scenario.assert(
      "Choice histories diverged across equivalent story starts",
      assertions.historiesDiverge,
      { branchA: optionAId, branchB: optionBId },
      {
        branchA: historyA[0]?.optionId ?? null,
        branchB: historyB[0]?.optionId ?? null,
      },
    );
    scenario.assert(
      "Each branch produced exactly one consequence",
      assertions.oneConsequencePerBranch,
      { branchA: 1, branchB: 1 },
      { branchA: consequencesA.length, branchB: consequencesB.length },
    );
    scenario.assert(
      "No branch leaked the other option",
      assertions.noCrossContamination,
      true,
      {
        branchAOption: branchA?.option_id ?? null,
        branchBOption: branchB?.option_id ?? null,
      },
    );

    scenario.delta(
      "branchA.choice",
      "same-entry-scene",
      "ask-mira",
      "first branch committed option A",
    );
    scenario.delta(
      "branchB.choice",
      "same-entry-scene",
      "follow-lights",
      "second branch committed option B",
    );

    const passed = Object.values(assertions).every(Boolean);
    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "Two equivalent story starts committed different options and PostgreSQL reload proved their histories, consequences, and events remained branch-specific."
        : "Choice branch divergence or cross-session isolation assertions failed.",
    });
    await writeScenarioArtifacts(report, { environment: "integration" });
    expect(report.result).toBe("PASS");
  });
});
