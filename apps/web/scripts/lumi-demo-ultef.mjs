import pg from "pg";

import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import {
  runDemoReset,
  runDemoSeed,
  runDemoStatus,
} from "../../../scripts/demo/lumi-demo-runner.mjs";
import { LUMI_DEMO_MANIFEST } from "../../../scripts/demo/lumi-demo-manifest.mjs";
import { createLumiDemoAuthPostgresAdapter } from "./lumi-demo-auth-db.mjs";
import { createLumiDemoPostgresAdapter } from "./lumi-demo-db.mjs";
import { createLumiDemoStoryPostgresAdapter } from "./lumi-demo-story-db.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");

const dbName =
  new URL(databaseUrl).pathname.replace(/^\//, "").split("?")[0] ?? "";
if (!dbName.includes("test") && !dbName.includes("review")) {
  throw new Error(
    `S51 ULTEF requires disposable test/review DB; got '${dbName}'.`,
  );
}

const confirmation = LUMI_DEMO_MANIFEST.manifestVersion;
const foreignHouseholdId = "52000000-0000-4000-8000-000000000051";
const foreignSlug = "s51-ultef-foreign-household";
const admin = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const core = createLumiDemoPostgresAdapter(databaseUrl);
const auth = createLumiDemoAuthPostgresAdapter(databaseUrl);
const story = createLumiDemoStoryPostgresAdapter(databaseUrl);

async function finishScenario(scenario, passed, reason) {
  const report = scenario.finish({ result: passed ? "PASS" : "FAIL", reason });
  await writeScenarioArtifacts(report, {
    environment: "disposable-postgres-s51-demo-universe",
  });
  if (!passed) throw new Error(`${report.id}:FAIL`);
}

try {
  await admin.query(
    `INSERT INTO profile.households (id, name, slug)
     VALUES ($1,'S51 ULTEF Foreign Household',$2)
     ON CONFLICT (id) DO NOTHING`,
    [foreignHouseholdId, foreignSlug],
  );

  const seedScenario = createScenario({
    id: "PX-LUMI-S51-DEMO-SEED-001",
    title: "Canonical demo universe seeds into production-shaped persistence",
    level: "L9",
    projectGate: "PX-LUMI-S51",
    seed: LUMI_DEMO_MANIFEST.manifestVersion,
  });

  const first = await runDemoSeed({
    databaseUrl,
    adapter: core,
    nodeEnv: "test",
    confirmation,
  });
  const authFirst = await auth.ensure({
    password: process.env.LUMI_DEMO_PARENT_PASSWORD,
  });
  const storyFirst = await story.ensure();
  const firstStatus = await runDemoStatus({ adapter: core });
  const firstStoryStatus = await story.inspect();

  const seedPassed =
    first.outcome === "seeded" &&
    authFirst.ready === true &&
    storyFirst.outcome === "seeded" &&
    firstStatus.exists === true &&
    firstStatus.currentLocationKey ===
      LUMI_DEMO_MANIFEST.world.startLocationKey &&
    firstStatus.counts?.profiles === 1 &&
    firstStatus.counts?.characters === 1 &&
    firstStatus.counts?.worlds === 1 &&
    firstStatus.counts?.inventoryItems ===
      LUMI_DEMO_MANIFEST.inventory.length &&
    firstStatus.counts?.npcs === LUMI_DEMO_MANIFEST.npcs.length &&
    firstStatus.counts?.memories === LUMI_DEMO_MANIFEST.memories.length &&
    firstStatus.counts?.quests === 1 &&
    firstStoryStatus.ready === true;

  seedScenario.assert(
    "Empty disposable DB becomes one complete browser-ready demo universe",
    seedPassed,
    {
      profile: 1,
      character: 1,
      world: 1,
      inventoryItems: LUMI_DEMO_MANIFEST.inventory.length,
      npcs: LUMI_DEMO_MANIFEST.npcs.length,
      memories: LUMI_DEMO_MANIFEST.memories.length,
      quests: 1,
      storyReady: true,
      authReady: true,
    },
    { first, authFirst, storyFirst, firstStatus, firstStoryStatus },
  );
  await finishScenario(
    seedScenario,
    seedPassed,
    seedPassed
      ? "Canonical demo seed created the complete production-shaped Elif/Lina/Işık Vadisi reference universe."
      : "Canonical demo seed did not satisfy one or more browser-ready postconditions.",
  );

  const replayScenario = createScenario({
    id: "PX-LUMI-S51-DEMO-SEED-REPLAY-002",
    title:
      "Demo seed replay preserves existing reference state without duplicates",
    level: "L9",
    projectGate: "PX-LUMI-S51",
    seed: LUMI_DEMO_MANIFEST.manifestVersion,
  });
  const replay = await runDemoSeed({
    databaseUrl,
    adapter: core,
    nodeEnv: "test",
    confirmation,
  });
  const authReplay = await auth.ensure({
    password: process.env.LUMI_DEMO_PARENT_PASSWORD,
  });
  const storyReplay = await story.ensure();
  const replayStatus = await runDemoStatus({ adapter: core });
  const replayPassed =
    replay.outcome === "already_seeded" &&
    authReplay.ready === true &&
    storyReplay.outcome === "already_ready" &&
    replayStatus.counts?.profiles === 1 &&
    replayStatus.counts?.characters === 1 &&
    replayStatus.counts?.worlds === 1 &&
    replayStatus.counts?.inventoryItems ===
      LUMI_DEMO_MANIFEST.inventory.length &&
    replayStatus.counts?.npcs === LUMI_DEMO_MANIFEST.npcs.length &&
    replayStatus.counts?.memories === LUMI_DEMO_MANIFEST.memories.length &&
    replayStatus.counts?.quests === 1;

  replayScenario.assert(
    "Second seed is a no-op for canonical played state",
    replayPassed,
    { core: "already_seeded", story: "already_ready", duplicateCounts: false },
    { replay, authReplay, storyReplay, replayStatus },
  );
  await finishScenario(
    replayScenario,
    replayPassed,
    replayPassed
      ? "Replay reused the existing demo universe and produced no duplicate canonical rows."
      : "Replay changed or duplicated canonical demo state.",
  );

  const resetScenario = createScenario({
    id: "PX-LUMI-S51-DEMO-SCOPED-RESET-003",
    title: "Demo reset removes only the canonical demo scope",
    level: "L9",
    projectGate: "PX-LUMI-S51",
    seed: LUMI_DEMO_MANIFEST.manifestVersion,
  });
  await story.reset();
  const reset = await runDemoReset({
    databaseUrl,
    adapter: core,
    nodeEnv: "test",
    confirmation,
  });
  await auth.reset();
  const after = await runDemoStatus({ adapter: core });
  const authAfter = await auth.inspect();
  const foreign = await admin.query(
    `SELECT count(*)::int AS count
       FROM profile.households
      WHERE id = $1 AND slug = $2`,
    [foreignHouseholdId, foreignSlug],
  );
  const resetPassed =
    reset.outcome === "reset" &&
    after.exists === false &&
    authAfter.parentExists === false &&
    foreign.rows[0]?.count === 1;

  resetScenario.assert(
    "Explicit reset removes demo story/auth/world state and preserves foreign household",
    resetPassed,
    { demoExists: false, demoParentExists: false, foreignHouseholds: 1 },
    { reset, after, authAfter, foreignHouseholds: foreign.rows[0]?.count ?? 0 },
  );
  await finishScenario(
    resetScenario,
    resetPassed,
    resetPassed
      ? "Scoped reset removed the canonical demo universe while preserving unrelated household state."
      : "Scoped reset violated demo cleanup or tenant-isolation postconditions.",
  );

  console.log("S51 canonical DB-backed ULTEF evidence: PASS");
} finally {
  await story.close();
  await auth.close();
  await core.close();
  await admin.query(`DELETE FROM profile.households WHERE id = $1`, [
    foreignHouseholdId,
  ]);
  await admin.end();
}
