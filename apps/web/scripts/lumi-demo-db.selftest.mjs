import pg from "pg";

import {
  runDemoReset,
  runDemoSeed,
  runDemoStatus,
} from "../../../scripts/demo/lumi-demo-runner.mjs";
import { LUMI_DEMO_MANIFEST } from "../../../scripts/demo/lumi-demo-manifest.mjs";
import { createLumiDemoPostgresAdapter } from "./lumi-demo-db.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");

const foreignHouseholdId = "52000000-0000-4000-8000-000000000001";
const foreignSlug = "s51-foreign-household";
const confirmation = LUMI_DEMO_MANIFEST.manifestVersion;
const admin = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const adapter = createLumiDemoPostgresAdapter(databaseUrl);

try {
  await admin.query(
    `INSERT INTO profile.households (id, name, slug)
     VALUES ($1,'S51 Foreign Household',$2)
     ON CONFLICT (id) DO NOTHING`,
    [foreignHouseholdId, foreignSlug],
  );

  const first = await runDemoSeed({
    databaseUrl,
    adapter,
    nodeEnv: "test",
    confirmation,
  });
  if (first.outcome !== "seeded") throw new Error("FIRST_SEED_NOT_APPLIED");

  const status = await runDemoStatus({ adapter });
  if (!status.exists) throw new Error("DEMO_STATUS_MISSING");
  if (status.currentLocationKey !== LUMI_DEMO_MANIFEST.world.startLocationKey) {
    throw new Error("DEMO_START_LOCATION_MISMATCH");
  }
  if (status.counts?.profiles !== 1 || status.counts?.characters !== 1 || status.counts?.worlds !== 1) {
    throw new Error("DEMO_BOOTSTRAP_COUNTS_INVALID");
  }

  const replay = await runDemoSeed({
    databaseUrl,
    adapter,
    nodeEnv: "test",
    confirmation,
  });
  if (replay.outcome !== "already_seeded") throw new Error("SEED_REPLAY_NOT_IDEMPOTENT");

  const reset = await runDemoReset({
    databaseUrl,
    adapter,
    nodeEnv: "test",
    confirmation,
  });
  if (reset.outcome !== "reset") throw new Error("DEMO_RESET_NOT_APPLIED");

  const after = await runDemoStatus({ adapter });
  if (after.exists) throw new Error("DEMO_RESET_LEFT_SCOPE");

  const foreign = await admin.query(
    `SELECT count(*)::int AS count FROM profile.households WHERE id = $1 AND slug = $2`,
    [foreignHouseholdId, foreignSlug],
  );
  if (foreign.rows[0]?.count !== 1) throw new Error("FOREIGN_HOUSEHOLD_WAS_MUTATED");

  console.log("S51 T03 PostgreSQL bootstrap selftest: PASS");
} finally {
  await adapter.close();
  await admin.query(`DELETE FROM profile.households WHERE id = $1`, [foreignHouseholdId]);
  await admin.end();
}
