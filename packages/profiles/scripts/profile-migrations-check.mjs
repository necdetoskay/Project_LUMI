import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readMigrationManifest,
  summarizeManifest,
} from "./profile-migration-contract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationDir = resolve(__dirname, "..", "migrations");

try {
  const migrations = readMigrationManifest(migrationDir);
  const manifest = summarizeManifest(migrations);
  const latest = manifest.at(-1);

  console.warn(
    `Profile migration integrity OK: ${manifest.length} files` +
      (latest ? `, latest=${latest.file}` : ""),
  );
} catch (error) {
  console.error("Profile migration integrity check failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
