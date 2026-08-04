import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createDatabase, type Database } from "../db/client";

let db: Database | undefined;

function parseEnvFile(filePath: string): Record<string, string> {
  const values: Record<string, string> = {};
  if (!existsSync(filePath)) {
    return values;
  }

  const raw = readFileSync(filePath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^[`'"]|[`'"]$/g, "");
    values[key] = value;
  }

  return values;
}

function loadFallbackDatabaseUrl(): string | undefined {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, ".env"),
    resolve(cwd, ".env.local"),
    resolve(cwd, "apps", "web", ".env.local"),
    resolve(cwd, "..", "..", ".env"),
    resolve(cwd, "..", "..", "apps", "web", ".env.local"),
  ];

  for (const filePath of candidates) {
    const env = parseEnvFile(filePath);
    if (env.DATABASE_URL) {
      return env.DATABASE_URL;
    }
  }

  return undefined;
}

function getConnectionString(): string {
  return (
    process.env.DATABASE_URL ??
    loadFallbackDatabaseUrl() ??
    "postgresql://lumi:lumi_local_only@localhost:15432/lumi"
  );
}

export function getProfileDb(): Database {
  db ??= createDatabase(getConnectionString());
  return db;
}
