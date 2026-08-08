import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import {
  WorldCommitService,
  __setTestCommitDb,
  __setTestGeneratedSceneDb,
  __setTestPropagationDb,
  __setTestSessionDb,
  completeSession,
  getSessionPlaybackState,
  persistGeneratedSceneAndAdvance,
  startSession,
} from "@lumi/story/application";
import { createDatabase as createStoryDatabase } from "@lumi/story/db/client";
import {
  EvidenceValidator,
  NarrativeEventExtractor,
  OutcomeManifest,
  StoryContextSnapshot,
  WorldCommitRuleEngine,
} from "@lumi/story/domain";
import { createDatabase as createNpcDatabase } from "@lumi/npc-intelligence/db/client";
import { DrizzleBeliefSourceRepository } from "@lumi/npc-intelligence/db";

import { createRumorMaterializationRuntime } from "@/lib/rumor-materialization-runtime";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import {
  cleanupStoryFixture,
  seedStoryFixture,
} from "../../../packages/story/tests/integration/ultef-fixtures";

const enabled = process.env.ULTEF_SCENARIO === "L6-GOLDEN-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

const CLAIM = "Eski koprunun isiklari firtinadan once yaniyor.";
const FACT_ID = "bridge-lights-before-storm";

let pool: pg.Pool;
let storyDb: ReturnType<typeof createStoryDatabase>;
let npcDb: ReturnType<typeof createNpcDatabase>;
let beliefRepository: DrizzleBeliefSourceRepository;

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF golden journey requires a disposable DB name containing test/review; got '${name}'.`,
    );
  }
}

beforeAll(async () => {
  if (!enabled || !destructive || !databaseUrl) return;
  assertSafeDisposableDatabase(databaseUrl);
  pool = new pg.Pool({ connectionString: databaseUrl });
  storyDb = createStoryDatabase(databaseUrl);
  npcDb = createNpcDatabase(databaseUrl);
  beliefRepository = new DrizzleBeliefSourceRepository(npcDb);
  __setTestGeneratedSceneDb(storyDb);
  __setTestSessionDb(storyDb);
  __setTestCommitDb(storyDb);
  __setTestPropagationDb(storyDb);
});

afterAll(async () => {
  __setTestGeneratedSceneDb(undefined);
  __setTestSessionDb(undefined);
  __setTestCommitDb(undefined);
  __setTestPropagationDb(undefined);
  if (pool) await pool.end();
});

ultefDescribe(
  "ULTEF L6-GOLDEN-001 — canonical headless continuity journey",
  () => {
    it("runs Deniz and Arin from story scene through world commit, rumor materialization, reload and a later session", async () => {
      const fixture = {
        householdId: crypto.randomUUID(),
        childProfileId: crypto.randomUUID(),
        characterId: crypto.randomUUID(),
        worldId: crypto.randomUUID(),
        storyDefinitionId: crypto.randomUUID(),
        storyVersionId: crypto.randomUUID(),
        entrySceneId: crypto.randomUUID(),
        storySessionId: crypto.randomUUID(),
      };
      const sourceNpcId = crypto.randomUUID();
      const targetNpcId = crypto.randomUUID();

      await seedStoryFixture(pool, fixture);

      const scenario = createScenario({
        id: "L6-GOLDEN-001",
        title: "Golden headless continuity journey",
        level: "L6",
        projectGate: "PX-LUMI-09",
        seed: "l6-golden-001",
      });

      scenario.setup("Household", {
        id: fixture.householdId,
        alias: "H-GOLDEN-001",
      });
      scenario.setup("Child", {
        id: fixture.childProfileId,
        name: "Deniz",
        ageBand: "6-8",
      });
      scenario.setup("Character", { id: fixture.characterId, name: "Arin" });
      scenario.setup("World", { id: fixture.worldId, name: "Gunes Vadisi" });
      scenario.setup("NPC source", { id: sourceNpcId, name: "Mira" });
      scenario.setup("NPC target", { id: targetNpcId, name: "Bora" });

      try {
        scenario.event(
          "profile.ready",
          "Deniz profili ve Arin karakteri aynı test household'u içinde hazırlandı.",
        );
        scenario.event(
          "world.ready",
          "Gunes Vadisi ve başlangıç hikâye session'ı hazırlandı.",
        );

        const beforePlayback = await getSessionPlaybackState(
          fixture.storySessionId,
        );
        scenario.assert(
          "Initial story session belongs to Deniz",
          beforePlayback.session.childProfileId === fixture.childProfileId,
          fixture.childProfileId,
          beforePlayback.session.childProfileId,
        );

        const generated = {
          sceneId: "golden-generated-scene",
          setting: "Gunes Vadisi eski kutuphanesinin sicak okuma kosesi",
          characters: ["Arin", "Mira"],
          moment:
            "Mira, Arin'e eski koprunun isiklarinin firtinadan once yandigina dair duydugu soylentiyi anlatti.",
          narrative:
            "Mira, Arin'e eski koprunun isiklarinin firtinadan once yandigini duydugunu anlatti. Arin, 'Bunu ilk kim gordu?' diye sordu ve Mira birlikte daha fazla bilgi toplamayi onerdi.",
          nextPrompt: "Arin soylentinin kaynagini arastirmak istiyor.",
        };

        scenario.event(
          "npc.encountered",
          "Arin, Eski Kutuphane'de Mira ile karsilasti.",
        );
        scenario.event(
          "rumor.heard",
          `Mira, Arin'e '${CLAIM}' soylentisini anlatti.`,
          { sourceNpcId, factId: FACT_ID },
        );
        scenario.event(
          "choice.selected",
          "Arin 'Bunu ilk kim gordu?' secimini yapti.",
        );

        const advanced = await persistGeneratedSceneAndAdvance({
          sessionId: fixture.storySessionId,
          expectedVersion: 1,
          scene: generated,
          sourceHookId: "golden-rumor-hook",
          modelId: "deterministic-ultef-provider",
          idempotencyKey: "l6-golden-scene-advance",
        });
        scenario.event(
          "scene.persisted",
          `Generated scene persisted and session advanced to version ${advanced.playbackState.session.version}.`,
          { generatedSceneId: advanced.generatedSceneId },
        );
        scenario.delta(
          "story.session.version",
          1,
          advanced.playbackState.session.version,
          "generated scene progression",
        );

        const manifest = OutcomeManifest.create({
          storySessionId: fixture.storySessionId,
          householdId: fixture.householdId,
          worldId: fixture.worldId,
          source: "story_session",
          sourceSceneId: advanced.generatedSceneId,
          changes: [
            {
              key: "golden-mira-rumor-memory",
              outcomeType: "npc_state_update",
              entityId: sourceNpcId,
              operation: "set",
              field: "memory.bridgeRumor",
              value: CLAIM,
              evidenceRef: `scene://${advanced.generatedSceneId}#rumor`,
            },
          ],
        });
        const snapshot = StoryContextSnapshot.create({
          storySessionId: fixture.storySessionId,
          householdId: fixture.householdId,
          worldId: fixture.worldId,
          worldStateHash: "golden-before",
          entities: [
            {
              entityId: sourceNpcId,
              entityKind: "npc",
              state: { memory: {} },
              stateHash: "mira-before",
            },
          ],
        });
        const ruleEngine = new WorldCommitRuleEngine({
          rules: [
            {
              forEventType: "npc_state_changed",
              apply: ({ event, priority }) => ({
                changeKey: event.eventKey,
                entityId: event.entityId,
                kind: "set",
                field: event.detail.field,
                value: event.detail.value,
                priority,
                ruleId: "golden-rumor-direct",
                sequence: event.sequence,
                evidenceRef: event.evidenceRef,
                status: "committed",
              }),
              applyIndirect: ({ event }) => [
                {
                  intentKey: `${event.eventKey}:bora-rumor`,
                  intentType: "npc_rumor_spread",
                  targetEntityId: targetNpcId,
                  payload: {
                    sourceNpcId,
                    targetNpcId,
                    factId: FACT_ID,
                    claim: CLAIM,
                    confidence: 0.8,
                    provenance: [sourceNpcId],
                    hops: 1,
                  },
                  evidenceRef: event.evidenceRef,
                  sourceEventKey: event.eventKey,
                },
              ],
            },
          ],
        });

        const commitService = new WorldCommitService();
        const commitInput = {
          manifest,
          snapshot,
          extractor: new NarrativeEventExtractor(),
          validator: new EvidenceValidator(),
          ruleEngine,
        };
        const firstCommit = await commitService.commitManifest(commitInput);
        const retryCommit = await commitService.commitManifest(commitInput);
        scenario.event(
          "outcome.committed",
          `Story outcome committed once; world version ${firstCommit.worldVersionBefore} -> ${firstCommit.worldVersionAfter}.`,
          { commitId: firstCommit.commitId },
        );
        scenario.assert(
          "Outcome retry reused the same commit",
          retryCommit.commitId === firstCommit.commitId,
          firstCommit.commitId,
          retryCommit.commitId,
        );
        scenario.delta(
          "world.version",
          firstCommit.worldVersionBefore,
          firstCommit.worldVersionAfter,
          "story outcome commit",
        );

        const runtime = createRumorMaterializationRuntime({ beliefRepository });
        const propagation = await runtime.propagate({
          householdId: fixture.householdId,
        });
        const beliefs = await beliefRepository.getBeliefs(
          targetNpcId,
          fixture.householdId,
        );
        const bridgeBelief = beliefs.find((item) => item.factId === FACT_ID);
        scenario.event(
          "rumor.materialized",
          bridgeBelief
            ? `Bora, Mira kaynakli kopru soylentisini hearsay olarak ogrendi; confidence=${bridgeBelief.confidence}.`
            : "Bora icin beklenen soylenti belief'i bulunamadi.",
        );
        scenario.delta(
          "Bora.beliefs.bridge-lights.present",
          false,
          Boolean(bridgeBelief),
          "indirect story outcome propagation",
        );
        scenario.assert(
          "Rumor propagation applied exactly once",
          propagation.applied === 1,
          1,
          propagation.applied,
        );
        scenario.assert(
          "Bora stored the rumor as hearsay",
          bridgeBelief?.source === "hearsay",
          "hearsay",
          bridgeBelief?.source ?? null,
        );
        scenario.assert(
          "Bora rumor provenance identifies Mira",
          bridgeBelief?.provenance.includes(sourceNpcId) === true,
          true,
          bridgeBelief?.provenance ?? null,
        );

        const completed = await completeSession({
          sessionId: fixture.storySessionId,
          expectedVersion: 2,
          idempotencyKey: "l6-golden-complete",
        });
        scenario.event(
          "story.completed",
          `Ilk story session ${completed.session.sessionStatus} durumuna getirildi.`,
        );

        const later = await startSession({
          householdId: fixture.householdId,
          childProfileId: fixture.childProfileId,
          worldId: fixture.worldId,
          storyDefinitionId: fixture.storyDefinitionId,
          storyVersionId: fixture.storyVersionId,
          characterId: fixture.characterId,
          idempotencyKey: "l6-golden-later-session",
        });
        scenario.event(
          "later-session.started",
          `Deniz ve Arin icin ayni Gunes Vadisi'nde yeni session ${later.session.id} baslatildi.`,
        );

        const reloadedBeliefs = await beliefRepository.getBeliefs(
          targetNpcId,
          fixture.householdId,
        );
        const reloadedBridgeBelief = reloadedBeliefs.find(
          (item) => item.factId === FACT_ID,
        );
        scenario.event(
          "continuity.confirmed",
          reloadedBridgeBelief
            ? "Yeni session basladiktan sonra Bora'nin onceki Mira soylentisi PostgreSQL reload sonrasinda hala mevcut."
            : "Yeni session basladi ancak Bora'nin onceki soylentisi reload sonrasinda bulunamadi.",
        );
        scenario.assert(
          "Later session belongs to the same child and world",
          later.session.childProfileId === fixture.childProfileId &&
            later.session.worldId === fixture.worldId,
          { childProfileId: fixture.childProfileId, worldId: fixture.worldId },
          {
            childProfileId: later.session.childProfileId,
            worldId: later.session.worldId,
          },
        );
        scenario.assert(
          "Prior rumor survives into later-session continuity context",
          reloadedBridgeBelief?.claim === CLAIM,
          CLAIM,
          reloadedBridgeBelief?.claim ?? null,
        );

        const passed =
          advanced.playbackState.session.version === 2 &&
          retryCommit.commitId === firstCommit.commitId &&
          propagation.applied === 1 &&
          bridgeBelief?.source === "hearsay" &&
          bridgeBelief.provenance.includes(sourceNpcId) &&
          later.session.childProfileId === fixture.childProfileId &&
          later.session.worldId === fixture.worldId &&
          reloadedBridgeBelief?.claim === CLAIM;

        const report = scenario.finish({
          result: passed ? "PASS" : "FAIL",
          reason: passed
            ? "Deniz/Arin headless journey advanced a generated scene, committed its outcome, materialized Mira's rumor into Bora's persisted hearsay state, reloaded persistence, and observed the same state after a later session started."
            : "One or more Golden Journey continuity boundaries failed.",
        });
        await writeScenarioArtifacts(report, {
          environment: "disposable-postgres-headless-e2e",
        });
        expect(report.result).toBe("PASS");
      } finally {
        await pool.query(
          "DELETE FROM npc_intelligence.beliefs WHERE household_id = $1",
          [fixture.householdId],
        );
        await pool.query(
          "DELETE FROM story.story_outbox WHERE household_id = $1",
          [fixture.householdId],
        );
        await pool.query(
          "DELETE FROM story.story_commit_records WHERE household_id = $1",
          [fixture.householdId],
        );
        await pool.query(
          "DELETE FROM story.story_world_versions WHERE household_id = $1",
          [fixture.householdId],
        );
        const laterSessionIds = await pool.query<{ id: string }>(
          "SELECT id FROM story.story_sessions WHERE household_id = $1 AND id <> $2",
          [fixture.householdId, fixture.storySessionId],
        );
        for (const row of laterSessionIds.rows) {
          await pool.query(
            "DELETE FROM story.story_idempotency_ledger WHERE story_session_id = $1",
            [row.id],
          );
          await pool.query(
            "DELETE FROM story.story_event_store WHERE story_session_id = $1",
            [row.id],
          );
          await pool.query(
            "DELETE FROM story.story_session_checkpoints WHERE story_session_id = $1",
            [row.id],
          );
          await pool.query(
            "DELETE FROM story.story_session_scene_visits WHERE story_session_id = $1",
            [row.id],
          );
          await pool.query(
            "DELETE FROM story.story_session_characters WHERE story_session_id = $1",
            [row.id],
          );
          await pool.query("DELETE FROM story.story_sessions WHERE id = $1", [
            row.id,
          ]);
        }
        await cleanupStoryFixture(pool, fixture);
      }
    });
  },
);
