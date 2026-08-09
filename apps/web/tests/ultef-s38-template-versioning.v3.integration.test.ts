import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import {
  createStoryDefinition,
  createStoryVersion,
  createStoryTemplateRevision,
  getStoryVersionGraph,
  listStoryTemplateVersions,
  publishStoryTemplateRevision,
  saveSceneGraph,
} from "../../../packages/story/src/application/index";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";

const ID = "PX-LUMI-S38-TEMPLATE-VERSIONING-PROD-001";
const url = process.env.STORY_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const run =
  process.env.ULTEF_SCENARIO === ID &&
  process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true" &&
  url
    ? describe
    : describe.skip;

let pool: pg.Pool;

const v1Scenes = [
  {
    sceneKey: "entry",
    sequenceNumber: 0,
    sceneType: "narrative",
    title: "Başlangıç",
    narrativeText: "Lumi eski fenerin kapısını açtı.",
    isEntryScene: true,
  },
  {
    sceneKey: "ending",
    sequenceNumber: 1,
    sceneType: "ending",
    title: "Işık",
    narrativeText: "Fener yeniden güvenli bir ışıkla parladı.",
    isTerminalScene: true,
  },
];

const transitions = [
  {
    fromSceneKey: "entry",
    toSceneKey: "ending",
    transitionType: "automatic",
  },
];

run("ULTEF S38 story template authoring/versioning", () => {
  beforeAll(async () => {
    const db = new URL(url!).pathname.replace(/^\//, "");
    if (!db.includes("test") && !db.includes("review")) {
      throw new Error(`Unsafe DB: ${db}`);
    }
    pool = new pg.Pool({ connectionString: url!, max: 4 });
  });

  afterAll(async () => {
    await pool?.end();
  });

  it(ID, async () => {
    const h1 = crypto.randomUUID();
    const h2 = crypto.randomUUID();
    const scenario = createScenario({
      id: ID,
      title: "Story template authoring and immutable version promotion",
      level: "L9",
      projectGate: "PX-LUMI-S38",
      seed: "runtime-uuid",
    });

    let definitionId: string | undefined;
    try {
      await pool.query(
        `INSERT INTO profile.households(id,name,slug)
         VALUES($1,'S38 A',$3),($2,'S38 B',$4)`,
        [h1, h2, `s38-a-${h1}`, `s38-b-${h2}`],
      );

      const definition = await createStoryDefinition({
        householdId: h1,
        title: "Fener Şablonu",
        slug: `s38-template-${crypto.randomUUID()}`,
        storyType: "interactive",
        sourceType: "authored",
        ageGroup: "6-8",
        defaultLanguage: "tr-TR",
      });
      definitionId = definition.id;
      const v1 = await createStoryVersion({
        storyDefinitionId: definition.id,
        versionNumber: 1,
        title: "Fener Şablonu / v1",
        storyMode: "interactive",
      });
      await saveSceneGraph({
        storyDefinitionId: definition.id,
        storyVersionId: v1.id,
        scenes: v1Scenes,
        transitions,
      });
      await publishStoryTemplateRevision({
        householdId: h1,
        storyDefinitionId: definition.id,
        storyVersionId: v1.id,
      });

      const v2 = await createStoryTemplateRevision({
        householdId: h1,
        storyDefinitionId: definition.id,
        title: "Fener Şablonu / v2 clone",
      });
      const graph1 = await getStoryVersionGraph(v1.id);
      const graph2 = await getStoryVersionGraph(v2.storyVersionId);
      const cloneOk =
        v2.versionNumber === 2 &&
        graph1.scenes.length === graph2.scenes.length &&
        graph1.scenes.every(
          (scene, index) =>
            scene.narrativeText === graph2.scenes[index]?.narrativeText &&
            scene.id !== graph2.scenes[index]?.id,
        );
      scenario.assert(
        "v2 cloned canonical v1 graph with independent identities",
        cloneOk,
        true,
        {
          v1: v1.id,
          v2: v2.storyVersionId,
          sceneCount: graph2.scenes.length,
        },
      );

      await publishStoryTemplateRevision({
        householdId: h1,
        storyDefinitionId: definition.id,
        storyVersionId: v2.storyVersionId,
      });
      const afterV2 = await listStoryTemplateVersions({
        householdId: h1,
        storyDefinitionId: definition.id,
      });
      const v1After = afterV2.versions.find((version) => version.id === v1.id);
      const v2After = afterV2.versions.find(
        (version) => version.id === v2.storyVersionId,
      );
      const promotionOk =
        afterV2.definition.currentPublishedVersionId === v2.storyVersionId &&
        v1After?.publicationStatus === "retired" &&
        v2After?.publicationStatus === "published";
      scenario.assert("v2 publish retired v1 atomically", promotionOk, true, {
        current: afterV2.definition.currentPublishedVersionId,
        v1Status: v1After?.publicationStatus,
        v2Status: v2After?.publicationStatus,
      });

      let immutableRejected = false;
      try {
        await saveSceneGraph({
          storyDefinitionId: definition.id,
          storyVersionId: v2.storyVersionId,
          scenes: v1Scenes,
          transitions,
        });
      } catch (error) {
        immutableRejected =
          error instanceof Error &&
          error.message.includes("Published story versions are immutable");
      }
      scenario.assert(
        "published revision remained immutable",
        immutableRejected,
        true,
        immutableRejected,
      );

      const v3Scenes = [
        {
          sceneKey: "entry",
          sequenceNumber: 0,
          sceneType: "narrative",
          title: "Başlangıç",
          narrativeText:
            "Lumi fenerin yanındaki sessiz bahçede yeni bir harita buldu.",
          isEntryScene: true,
        },
        {
          sceneKey: "ending",
          sequenceNumber: 1,
          sceneType: "ending",
          title: "Işık",
          narrativeText:
            "Harita, bir sonraki güvenli yolculuğun yönünü gösterdi.",
          isTerminalScene: true,
        },
      ];
      const v3 = await createStoryTemplateRevision({
        householdId: h1,
        storyDefinitionId: definition.id,
        title: "Fener Şablonu / v3 authored",
        scenes: v3Scenes,
        transitions,
      });
      await publishStoryTemplateRevision({
        householdId: h1,
        storyDefinitionId: definition.id,
        storyVersionId: v3.storyVersionId,
      });
      const graph3 = await getStoryVersionGraph(v3.storyVersionId);
      const afterV3 = await listStoryTemplateVersions({
        householdId: h1,
        storyDefinitionId: definition.id,
      });
      const replacementOk =
        v3.versionNumber === 3 &&
        afterV3.definition.currentPublishedVersionId === v3.storyVersionId &&
        graph3.scenes[0]?.narrativeText.includes("sessiz bahçede") === true &&
        afterV3.versions.find((version) => version.id === v2.storyVersionId)
          ?.publicationStatus === "retired";
      scenario.assert(
        "v3 replacement graph became canonical published revision",
        replacementOk,
        true,
        {
          current: afterV3.definition.currentPublishedVersionId,
          versionNumber: v3.versionNumber,
        },
      );

      let tenantRejected = false;
      try {
        await createStoryTemplateRevision({
          householdId: h2,
          storyDefinitionId: definition.id,
        });
      } catch (error) {
        tenantRejected =
          error instanceof Error && error.message.includes("does not belong");
      }
      scenario.assert(
        "foreign household authoring rejected",
        tenantRejected,
        true,
        tenantRejected,
      );

      const pass =
        cloneOk &&
        promotionOk &&
        immutableRejected &&
        replacementOk &&
        tenantRejected;
      const report = scenario.finish({
        result: pass ? "PASS" : "FAIL",
        reason: pass
          ? "Clone, authored replacement, immutable publication, active-version retirement and tenant isolation verified."
          : "S38 template versioning invariant failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-s38-template-versioning",
      });
      expect(report.result).toBe("PASS");
    } finally {
      if (definitionId) {
        await pool.query(
          `DELETE FROM story.story_scene_transitions
           WHERE story_version_id IN (SELECT id FROM story.story_versions WHERE story_definition_id=$1)`,
          [definitionId],
        );
        await pool.query(
          `DELETE FROM story.story_scenes
           WHERE story_version_id IN (SELECT id FROM story.story_versions WHERE story_definition_id=$1)`,
          [definitionId],
        );
        await pool.query(
          `DELETE FROM story.story_versions WHERE story_definition_id=$1`,
          [definitionId],
        );
        await pool.query(`DELETE FROM story.story_definitions WHERE id=$1`, [
          definitionId,
        ]);
      }
      await pool.query(`DELETE FROM profile.households WHERE id IN($1,$2)`, [
        h1,
        h2,
      ]);
    }
  });
});
