import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_FILE_PATTERN = /^(\d{4})_([a-z0-9_]+)\.sql$/;

// Historical duplicates already exist in production history. They are frozen here
// so we can hard-fail every new duplicate without rewriting legacy filenames.
const LEGACY_DUPLICATE_SEQUENCES = new Map([
  ["0061", new Set(["0061_ai_generation_trace_cost.sql", "0061_onboarding_llm_task.sql"])],
  ["0062", new Set(["0062_ai_generation_traces.sql", "0062_prompt_management_audit.sql"])],
]);

export function checksumSql(sql) {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

export function readMigrationManifest(migrationDir) {
  const files = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const migrations = files.map((file) => {
    const match = MIGRATION_FILE_PATTERN.exec(file);
    if (!match) {
      throw new Error(
        `Invalid profile migration filename: ${file}. Expected NNNN_snake_case.sql`,
      );
    }

    const sql = readFileSync(join(migrationDir, file), "utf8");
    return {
      file,
      sequence: match[1],
      sql,
      checksum: checksumSql(sql),
    };
  });

  validateMigrationManifest(migrations);
  return migrations;
}

export function validateMigrationManifest(migrations) {
  const bySequence = new Map();

  for (const migration of migrations) {
    const bucket = bySequence.get(migration.sequence) ?? [];
    bucket.push(migration.file);
    bySequence.set(migration.sequence, bucket);
  }

  for (const [sequence, files] of bySequence) {
    if (files.length < 2) {
      continue;
    }

    const legacyAllowed = LEGACY_DUPLICATE_SEQUENCES.get(sequence);
    const actual = new Set(files);
    const matchesFrozenLegacySet =
      legacyAllowed &&
      legacyAllowed.size === actual.size &&
      [...legacyAllowed].every((file) => actual.has(file));

    if (!matchesFrozenLegacySet) {
      throw new Error(
        `Duplicate profile migration sequence ${sequence}: ${files.join(", ")}. ` +
          "Migration sequence IDs must be unique; only the frozen legacy 0061/0062 duplicates are allowed.",
      );
    }
  }

  const duplicateFiles = migrations
    .map((migration) => migration.file)
    .filter((file, index, files) => files.indexOf(file) !== index);

  if (duplicateFiles.length > 0) {
    throw new Error(`Duplicate profile migration filenames: ${duplicateFiles.join(", ")}`);
  }
}

export function summarizeManifest(migrations) {
  return migrations.map(({ file, sequence, checksum }) => ({
    file,
    sequence,
    checksum,
  }));
}
