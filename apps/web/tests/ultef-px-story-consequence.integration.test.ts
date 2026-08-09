import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import {
  commitChoice,
  commitPersistedChoiceConsequence,
  createChoicePoint,
  createStoryDefinition,
  createStoryVersion,
  evaluateChoicePointAvailability,
  getLatestCheckpoint,
  publishStoryVersion,
  saveSceneGraph,
  startSession,
  StorySceneGenerationService,
  type OpenRouterCaller,
  type StorySceneLlmSettingsPort,
} from "@lumi/story/application";
import type { StoryHookState } from "@lumi/story/domain";

import { NpcBeliefStoryContinuityContextAdapter } from "@/lib/story-continuity-context-runtime";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";

const enabled =
  process.env.ULTEF_SCENARIO === "PX-LUMI-05-CHOICE-CONSEQUENCE-CONTINUITY-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

let pool: pg.Pool;

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `PX-LUMI-05 requires a disposable DB; got database '${name}'.`,
    );
  }
}

const settingsPort: StorySceneLlmSettingsPort = {
  async resolveSettings() {
    return {
      apiKey: "ultef-test-key",
      modelId: "deterministic-ultef-provider",
      temperature: 0,
      maxOutputTokens: 512,
      contentBoundary: "guvenli cocuk hikayesi",
      ageBand: "6-8",
      locale: "tr-TR",
    };
  },
};

function makeHook(input: {
  householdId: string;
  childProfileId: string;
  worldId: string;
}): StoryHookState {
  return {
    id: crypto.randomUUID(),
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    storySessionId: crypto.randomUUID(),
    worldId: input.worldId,
    opportunityId: crypto.randomUUID(),
    hookType: "quest_seed",
    sourceNpcId: crypto.randomUUID(),
    targetNpcId: null,
    payload: { prompt: "Arin onceki secimin sonucunu goruyor." },
    constraints: {},
    sceneType: "narrative",
    status: "pending",
    version: 1,
    createdAt: new Date(),
    consumedAt: null,
  };
}

function consequenceAwareCaller(capturedPrompts: string[]): OpenRouterCaller {
  return async (_apiKey, input) => {
    const prompt =
      input.messages.find((message) => message.role === "user")?.content ?? "";
    capturedPrompts.push(prompt);
    const seesCommittedChoice = prompt.includes(
      "Kalıcı seçim sonucu: flags.bridge_open=true.",
    );

    return {
      model: "deterministic-ultef-provider",
      content: JSON.stringify({
        sceneId: "px05-later-scene",
        setting: "Gunes Vadisi koprusu",
        characters: ["Arin"],
        narrative: seesCommittedChoice
          ? "Arin daha once actigi koprunun hala acik oldugunu gorup guvenle karsiya gecti."
          : "Arin koprunun yanina geldi.",
        moment: seesCommittedChoice
          ? "Kalici secim sonucu sonraki sahnede goruldu."
          : "Arin cevresine bakindi.",
        nextPrompt: "Arin koprunun diger tarafini arastirsin.",
      }),
    };
  };
}

beforeAll(async () => {
  if (!enabled || !destructive || !databaseUrl) return;
  assertSafeDisposableDatabase(databaseUrl);
  process.env.DATABASE_URL = databaseUrl;
  pool = new pg.Pool({ connectionString: databaseUrl });
});

afterAll(async () => {
  if (pool) await pool.end();
});

ultefDescribe("PX-LUMI-05-CHOICE-CONSEQUENCE-CONTINUITY-001", () => {
  it("commits a real persisted choice consequence once and exposes it to later story context", async () => {
    const householdId = crypto.randomUUID();
    const childProfileId = crypto.randomUUID();
    const characterId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const scenario = createScenario({
      id: "PX-LUMI-05-CHOICE-CONSEQUENCE-CONTINUITY-001",
      title:
        "Committed choice consequence reaches durable world and later story context",
      level: "PX-LUMI",
      projectGate: "PX-LUMI-05",
      seed: "px-lumi-05-choice-consequence-continuity-001",
    });
    let report: ReturnType<typeof scenario.finish> | null = null;

    try {
      await pool.query(
        `INSERT INTO profile.households (id, name, slug)
         VALUES ($1, 'PX05 Household', $2)`,
        [householdId, `px05-${householdId}`],
      );
      await pool.query(
        `INSERT INTO profile.household_members
          (household_id, user_id, membership_role, is_active)
         VALUES ($1, $2, 'owner', true)`,
        [householdId, userId],
      );
      await pool.query(
        `INSERT INTO profile.child_profiles
          (id, household_id, display_name, age_band, locale, metadata)
         VALUES ($1, $2, 'Deniz', '6-8', 'tr-TR', '{}'::jsonb)`,
        [childProfileId, householdId],
      );
      await pool.query(
        `INSERT INTO profile.lumi_characters
          (id, child_profile_id, household_id, name, broad_kind,
           character_type, subtype, origin_mode, first_origin_package_id,
           origin_concept, starting_region_archetype, starting_location,
           home_archetype, nearby_npc_seed, first_mystery_seed, universe_seed,
           safety_bounds, character_subtype, lifecycle_stage, version)
         VALUES
          ($1,$2,$3,'Arin','human','explorer','orman kasifi','auto',$4,
           'Merakli bir kasif','orman','orman girisi','agac ev','Bora',
           'eski kopru','px05-universe',
           '{"ageBand":"6-8","contentBoundary":"moderate","requireParentApprovalForAi":false}'::jsonb,
           'child_avatar','childhood',1)`,
        [characterId, childProfileId, householdId, crypto.randomUUID()],
      );
      await pool.query(
        `INSERT INTO profile.worlds
          (id, household_id, child_profile_id, character_id, universe_seed,
           origin_seed, accepted_candidate_seed, generator_version,
           vector_version, lifecycle_status, metadata, version)
         VALUES ($1,$2,$3,$4,'px05-universe','px05-origin','px05-candidate',
           'ultef-v1','vector-v1','active','{}'::jsonb,1)`,
        [worldId, householdId, childProfileId, characterId],
      );

      const definition = await createStoryDefinition({
        householdId,
        childProfileId,
        title: "PX05 Kopru Secimi",
        slug: `px05-${householdId}`,
        storyType: "interactive",
        sourceType: "generated",
        ageGroup: "6-8",
        defaultLanguage: "tr-TR",
      });
      const version = await createStoryVersion({
        storyDefinitionId: definition.id,
        versionNumber: 1,
        title: "PX05 Kopru Secimi v1",
        storyMode: "interactive",
      });
      const graph = await saveSceneGraph({
        storyDefinitionId: definition.id,
        storyVersionId: version.id,
        scenes: [
          {
            sceneKey: "bridge-choice",
            sequenceNumber: 0,
            sceneType: "choice",
            title: "Eski Kopru",
            narrativeText: "Arin kapali koprunun mekanizmasini buldu.",
            isEntryScene: true,
          },
          {
            sceneKey: "after-bridge",
            sequenceNumber: 1,
            sceneType: "ending",
            title: "Koprunun Otesi",
            narrativeText: "Arin seciminin sonucunu gorur.",
            isTerminalScene: true,
          },
        ],
        transitions: [
          {
            fromSceneKey: "bridge-choice",
            toSceneKey: "after-bridge",
            transitionType: "choice",
          },
        ],
      });
      await publishStoryVersion(definition.id, version.id);

      const entrySceneId = graph.sceneIds[0]!;
      const sessionState = await startSession({
        householdId,
        childProfileId,
        worldId,
        storyDefinitionId: definition.id,
        storyVersionId: version.id,
        characterId,
      });
      const sessionId = sessionState.session.id;
      const checkpoint = await getLatestCheckpoint(sessionId);

      const choice = await createChoicePoint({
        storyVersionId: version.id,
        sceneId: entrySceneId,
        choicePointKey: "bridge-action",
        choicePointType: "single",
        promptText: "Kopru mekanizmasi ile ne yapilsin?",
        ruleVersion: 1,
        options: [
          {
            optionKey: "open-bridge",
            optionText: "Kopruyu ac",
            sequenceNumber: 0,
            consequencePreviews: [
              {
                consequenceType: "flag_set",
                targetKey: "bridge_open",
                previewText: "Kopru kalici olarak acilir.",
              },
            ],
          },
        ],
      });
      const option = choice.options[0]!;

      const availability = await evaluateChoicePointAvailability(
        sessionId,
        choice.point.id,
        entrySceneId,
        version.id,
        checkpoint?.contentHash ?? "px05-checkpoint",
      );
      expect(availability.options[0]?.available).toBe(true);

      const committed = await commitChoice({
        storySessionId: sessionId,
        choicePointId: choice.point.id,
        optionId: option.id,
        evidenceSceneId: entrySceneId,
        idempotencyKey: "px05-choice-commit",
        actorUserId: userId,
      });
      if (!("committedChoice" in committed)) {
        throw new Error(
          "PX-LUMI-05 expected the first choice commit to be new",
        );
      }

      scenario.setup("ChoicePreState", {
        sessionId,
        worldId,
        choicePointId: choice.point.id,
        optionId: option.id,
        worldVersion: 1,
      });
      scenario.event(
        "choice_presented",
        "Presented active-scene choice option",
        {
          choicePointId: choice.point.id,
          optionId: option.id,
          available: true,
        },
      );
      scenario.event("choice_committed", "Committed real persisted choice", {
        committedChoiceId: committed.committedChoice.id,
        consequenceId: committed.consequence.id,
      });

      const firstCommit = await commitPersistedChoiceConsequence({
        storySessionId: sessionId,
        committedChoiceId: committed.committedChoice.id,
        householdId,
        worldId,
      });
      const replayCommit = await commitPersistedChoiceConsequence({
        storySessionId: sessionId,
        committedChoiceId: committed.committedChoice.id,
        householdId,
        worldId,
      });

      expect(firstCommit.ruleVersion).toBe("choice-world-handoff-v1");
      expect(firstCommit.manifest.id).toBe(committed.committedChoice.id);
      expect(firstCommit.commit.worldVersionBefore).toBe(1);
      expect(firstCommit.commit.worldVersionAfter).toBe(2);
      expect(firstCommit.commit.changes).toHaveLength(1);
      expect(firstCommit.commit.changes[0]).toMatchObject({
        entityId: worldId,
        field: "flags.bridge_open",
        value: true,
        kind: "set",
      });
      expect(replayCommit.commit.commitId).toBe(firstCommit.commit.commitId);
      expect(replayCommit.commit.worldVersionAfter).toBe(2);

      const worldVersion = await pool.query(
        `SELECT current_version, last_manifest_id
         FROM story.story_world_versions
         WHERE household_id = $1 AND world_id = $2`,
        [householdId, worldId],
      );
      expect(worldVersion.rows[0]?.current_version).toBe("2");
      expect(worldVersion.rows[0]?.last_manifest_id).toBe(
        committed.committedChoice.id,
      );

      const commitCount = await pool.query(
        `SELECT count(*)::int AS count
         FROM story.story_commit_records
         WHERE household_id = $1 AND world_id = $2 AND manifest_id = $3`,
        [householdId, worldId, committed.committedChoice.id],
      );
      expect(commitCount.rows[0]?.count).toBe(1);

      const continuity =
        await new NpcBeliefStoryContinuityContextAdapter().resolveContext({
          householdId,
          worldId,
          childProfileId,
          characterId,
          npcIds: [],
        });
      const choiceFact = continuity.facts.find((fact) =>
        fact.summary.includes("flags.bridge_open=true"),
      );
      expect(choiceFact).toBeDefined();

      const prompts: string[] = [];
      const generated =
        await new StorySceneGenerationService().generateSceneFromHook({
          hook: makeHook({ householdId, childProfileId, worldId }),
          childProfileId,
          characterId,
          continuityPort: new NpcBeliefStoryContinuityContextAdapter(),
          settingsPort,
          callOpenRouter: consequenceAwareCaller(prompts),
          maxAttempts: 1,
        });
      expect(prompts).toHaveLength(1);
      expect(prompts[0]).toContain(
        "Kalıcı seçim sonucu: flags.bridge_open=true.",
      );
      expect(generated.scene.narrative).toContain("actigi koprunun hala acik");

      scenario.event(
        "world_commit",
        "Committed choice-derived world consequence",
        {
          manifestId: firstCommit.manifest.id,
          commitId: firstCommit.commit.commitId,
          worldVersionBefore: firstCommit.commit.worldVersionBefore,
          worldVersionAfter: firstCommit.commit.worldVersionAfter,
          evidenceRef: firstCommit.evidenceRef,
        },
      );
      scenario.event(
        "replay",
        "Replayed the same committed choice consequence",
        {
          commitId: replayCommit.commit.commitId,
          worldVersionAfter: replayCommit.commit.worldVersionAfter,
        },
      );
      scenario.event(
        "later_story",
        "Generated later scene from committed choice continuity",
        {
          continuityFact: choiceFact?.summary,
          narrative: generated.scene.narrative,
        },
      );
      scenario.delta("world.version", 1, 2, "choice-derived world commit");
      scenario.delta(
        "world.flags.bridge_open",
        false,
        true,
        "selected option consequence preview",
      );
      scenario.assert(
        "presented option is valid for the active scene",
        availability.options[0]?.available === true,
        "selected option available",
        availability.options[0],
      );
      scenario.assert(
        "selected choice produces the rule-defined committed world consequence",
        firstCommit.commit.changes[0]?.field === "flags.bridge_open" &&
          firstCommit.commit.changes[0]?.value === true,
        "flags.bridge_open=true",
        firstCommit.commit.changes[0],
      );
      scenario.assert(
        "same persisted committed choice mutates the world only once",
        replayCommit.commit.commitId === firstCommit.commit.commitId &&
          replayCommit.commit.worldVersionAfter === 2 &&
          commitCount.rows[0]?.count === 1,
        "same commit id, world version 2, one commit row",
        {
          firstCommitId: firstCommit.commit.commitId,
          replayCommitId: replayCommit.commit.commitId,
          commitCount: commitCount.rows[0]?.count,
        },
      );
      scenario.assert(
        "later story context observes the committed consequence",
        choiceFact?.summary.includes("flags.bridge_open=true") === true &&
          generated.scene.narrative.includes("actigi koprunun hala acik"),
        "choice-derived world fact reaches later story generation",
        {
          continuityFact: choiceFact?.summary,
          narrative: generated.scene.narrative,
        },
      );

      report = scenario.finish({ result: "PASS" });
    } catch (error) {
      report = scenario.finish({
        result: "FAIL",
        reason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      if (report) await writeScenarioArtifacts(report);
    }
  });
});
