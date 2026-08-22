import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checksumSql,
  readMigrationManifest,
  validateMigrationManifest,
} from "./check-migrations.mjs";

function expectFailure(fn, pattern) {
  assert.throws(fn, pattern);
}

assert.equal(
  checksumSql("SELECT 1;"),
  checksumSql("SELECT 1;"),
  "checksum must be deterministic",
);
assert.notEqual(
  checksumSql("SELECT 1;"),
  checksumSql("SELECT 2;"),
  "checksum must change when migration content changes",
);

validateMigrationManifest("packages/profiles/migrations", [
  { file: "0061_ai_generation_trace_cost.sql", sequence: "0061" },
  { file: "0061_onboarding_llm_task.sql", sequence: "0061" },
  { file: "0062_ai_generation_traces.sql", sequence: "0062" },
  { file: "0062_prompt_management_audit.sql", sequence: "0062" },
]);

expectFailure(
  () =>
    validateMigrationManifest("packages/profiles/migrations", [
      { file: "0061_ai_generation_trace_cost.sql", sequence: "0061" },
      { file: "0061_onboarding_llm_task.sql", sequence: "0061" },
      { file: "0061_new_accidental_duplicate.sql", sequence: "0061" },
    ]),
  /duplicate migration sequence 0061/,
);

expectFailure(
  () =>
    validateMigrationManifest("packages/world/migrations", [
      { file: "0007_first.sql", sequence: "0007" },
      { file: "0007_second.sql", sequence: "0007" },
    ]),
  /duplicate migration sequence 0007/,
);

const root = mkdtempSync(join(tmpdir(), "lumi-migration-integrity-"));
try {
  const migrationDir = join(root, "packages", "sample", "migrations");
  mkdirSync(migrationDir, { recursive: true });
  writeFileSync(join(migrationDir, "0001_create_sample.sql"), "SELECT 1;\n");

  const valid = readMigrationManifest(migrationDir, root);
  assert.equal(valid.length, 1);
  assert.equal(valid[0].sequence, "0001");

  writeFileSync(join(migrationDir, "bad-name.sql"), "SELECT 2;\n");
  expectFailure(
    () => readMigrationManifest(migrationDir, root),
    /invalid migration filename bad-name\.sql/,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("Migration integrity self-test OK");
