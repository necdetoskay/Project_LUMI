import assert from "node:assert/strict";

import { LUMI_DEMO_MANIFEST } from "./lumi-demo-manifest.mjs";
import {
  LUMI_DEMO_CONFIRMATION,
  assertDemoDatabaseSafety,
  runDemoReset,
  runDemoSeed,
  runDemoStatus,
} from "./lumi-demo-runner.mjs";

function createMemoryAdapter(initial = null) {
  let state = initial;
  let seedCalls = 0;
  let resetCalls = 0;
  return {
    async inspect(manifest) {
      if (!state) return { exists: false };
      return {
        exists: true,
        householdId: state.householdId,
        householdKey: state.householdKey,
        manifestVersion: state.manifestVersion,
      };
    },
    async seed(manifest) {
      seedCalls += 1;
      state = {
        householdId: manifest.household.id,
        householdKey: manifest.household.key,
        manifestVersion: manifest.manifestVersion,
      };
      return { seedCalls };
    },
    async reset() {
      resetCalls += 1;
      state = null;
      return { resetCalls };
    },
    counts() {
      return { seedCalls, resetCalls };
    },
  };
}

const safe = {
  databaseUrl: "postgresql://lumi:lumi@localhost:5432/lumi_demo_local",
  nodeEnv: "development",
  confirmation: LUMI_DEMO_CONFIRMATION,
};

assert.equal(assertDemoDatabaseSafety(safe).safe, true);
assert.throws(
  () =>
    assertDemoDatabaseSafety({
      ...safe,
      databaseUrl: "postgresql://lumi:lumi@db:5432/lumi",
    }),
  /DEMO_DATABASE_NOT_DISPOSABLE/,
);
assert.throws(
  () => assertDemoDatabaseSafety({ ...safe, nodeEnv: "production" }),
  /DEMO_PRODUCTION_ENV_FORBIDDEN/,
);
assert.throws(
  () => assertDemoDatabaseSafety({ ...safe, confirmation: "wrong" }),
  /DEMO_CONFIRMATION_REQUIRED/,
);

const adapter = createMemoryAdapter();
const firstSeed = await runDemoSeed({ ...safe, adapter });
assert.equal(firstSeed.outcome, "seeded");
assert.deepEqual(adapter.counts(), { seedCalls: 1, resetCalls: 0 });

const replaySeed = await runDemoSeed({ ...safe, adapter });
assert.equal(replaySeed.outcome, "already_seeded");
assert.deepEqual(adapter.counts(), { seedCalls: 1, resetCalls: 0 });

const status = await runDemoStatus({ adapter });
assert.equal(status.exists, true);
assert.equal(status.householdId, LUMI_DEMO_MANIFEST.household.id);
assert.equal(status.manifestVersion, LUMI_DEMO_MANIFEST.manifestVersion);

const reset = await runDemoReset({ ...safe, adapter });
assert.equal(reset.outcome, "reset");
assert.deepEqual(adapter.counts(), { seedCalls: 1, resetCalls: 1 });
const resetReplay = await runDemoReset({ ...safe, adapter });
assert.equal(resetReplay.outcome, "already_absent");
assert.deepEqual(adapter.counts(), { seedCalls: 1, resetCalls: 1 });

const collisionAdapter = createMemoryAdapter({
  householdId: "52000000-0000-4000-8000-000000000001",
  householdKey: LUMI_DEMO_MANIFEST.household.key,
  manifestVersion: LUMI_DEMO_MANIFEST.manifestVersion,
});
await assert.rejects(
  () => runDemoSeed({ ...safe, adapter: collisionAdapter }),
  /DEMO_SCOPE_IDENTITY_MISMATCH/,
);

const versionAdapter = createMemoryAdapter({
  householdId: LUMI_DEMO_MANIFEST.household.id,
  householdKey: LUMI_DEMO_MANIFEST.household.key,
  manifestVersion: "lumi-demo-v0",
});
await assert.rejects(
  () => runDemoSeed({ ...safe, adapter: versionAdapter }),
  /DEMO_RESET_REQUIRED_FOR_VERSION_CHANGE/,
);

console.log("LUMI demo runner self-test: PASS");
