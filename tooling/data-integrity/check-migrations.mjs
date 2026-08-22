import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MIGRATION_FILE_PATTERN = /^(\d{4})_([a-z0-9_]+)\.sql$/;

const FROZEN_LEGACY_FILENAMES = new Map([
  [
    "packages/npc-intelligence/migrations",
    new Set([
      "20260808_ultef_belief_world_scope.sql",
      "20260809_s44_canonical_memories.sql",
      "20260809_s46_memory_usages.sql",
      "20260810_s48_npc_snapshots.sql",
      "20260810_s48_worker_npc_decisions.sql",
    ]),
  ],
]);

const FROZEN_LEGACY_DUPLICATES = new Map([
  [
    "packages/profiles/migrations",
    new Map([
      ["0061", new Set(["0061_ai_generation_trace_cost.sql", "0061_onboarding_llm_task.sql"])],
      ["0062", new Set(["0062_ai_generation_traces.sql", "0062_prompt_management_audit.sql"])],
    ]),
  ],
]);

export function checksumSql(sql) {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

export function discoverMigrationDirectories(rootDir) {
  const roots = ["apps", "packages"]
    .map((name) => join(rootDir, name))
    .filter((path) => existsSync(path));
  const found = [];

  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (["node_modules", ".next", "dist", "build", "coverage"].includes(entry.name)) continue;

      const fullPath = join(current, entry.name);
      if (entry.name === "migrations") {
        found.push(fullPath);
        continue;
      }
      walk(fullPath);
    }
  }

  for (const root of roots) walk(root);
  return found.sort();
}

export function readMigrationManifest(migrationDir, rootDir) {
  const scope = relative(rootDir, migrationDir).replaceAll("\\", "/");
  const files = readdirSync(migrationDir)
    .filter((file) => statSync(join(migrationDir, file)).isFile())
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const frozenLegacyNames = FROZEN_LEGACY_FILENAMES.get(scope) ?? new Set();

  const migrations = files.map((file) => {
    const match = MIGRATION_FILE_PATTERN.exec(file);
    const isFrozenLegacyName = frozenLegacyNames.has(file);

    if (!match && !isFrozenLegacyName) {
      throw new Error(
        `[${scope}] invalid migration filename ${file}; expected NNNN_snake_case.sql. ` +
          "Only explicitly frozen historical filenames may use another convention.",
      );
    }

    const sql = readFileSync(join(migrationDir, file), "utf8");
    return {
      scope,
      file,
      sequence: match?.[1] ?? null,
      checksum: checksumSql(sql),
      legacyFilename: isFrozenLegacyName,
    };
  });

  validateMigrationManifest(scope, migrations);
  return migrations;
}

export function validateMigrationManifest(scope, migrations) {
  const bySequence = new Map();
  const seenFiles = new Set();

  for (const migration of migrations) {
    if (seenFiles.has(migration.file)) {
      throw new Error(`[${scope}] duplicate migration filename ${migration.file}`);
    }
    seenFiles.add(migration.file);

    if (migration.sequence === null || migration.sequence === undefined) continue;

    const files = bySequence.get(migration.sequence) ?? [];
    files.push(migration.file);
    bySequence.set(migration.sequence, files);
  }

  const frozenForScope = FROZEN_LEGACY_DUPLICATES.get(scope) ?? new Map();

  for (const [sequence, files] of bySequence) {
    if (files.length < 2) continue;

    const frozen = frozenForScope.get(sequence);
    const actual = new Set(files);
    const exactFrozenMatch =
      frozen &&
      frozen.size === actual.size &&
      [...frozen].every((file) => actual.has(file));

    if (!exactFrozenMatch) {
      throw new Error(
        `[${scope}] duplicate migration sequence ${sequence}: ${files.join(", ")}. ` +
          "Sequence IDs must be unique; historical exceptions are frozen and cannot expand.",
      );
    }
  }
}

export function validateRepositoryMigrations(rootDir) {
  const directories = discoverMigrationDirectories(rootDir);
  if (directories.length === 0) {
    throw new Error("No migration directories discovered under apps/ or packages/.");
  }

  const manifests = directories.map((migrationDir) => ({
    directory: relative(rootDir, migrationDir).replaceAll("\\", "/"),
    migrations: readMigrationManifest(migrationDir, rootDir),
  }));

  return manifests;
}

function isMainModule() {
  return process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

if (isMainModule()) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const rootDir = resolve(__dirname, "..", "..");

  try {
    const manifests = validateRepositoryMigrations(rootDir);
    const migrationCount = manifests.reduce((sum, manifest) => sum + manifest.migrations.length, 0);
    const legacyFilenameCount = manifests.reduce(
      (sum, manifest) =>
        sum + manifest.migrations.filter((migration) => migration.legacyFilename).length,
      0,
    );
    console.log(
      `Migration integrity OK: ${manifests.length} scopes, ${migrationCount} SQL migrations checked, ` +
        `${legacyFilenameCount} frozen legacy filenames.`,
    );
    for (const manifest of manifests) {
      console.log(` - ${manifest.directory}: ${manifest.migrations.length}`);
    }
  } catch (error) {
    console.error("Migration integrity check failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
