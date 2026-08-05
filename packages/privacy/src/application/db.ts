import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createDatabase, type Database } from "../db/client";

let dbInstance: Database | undefined;

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed
      .slice(idx + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    process.env[key] ??= value;
  }
}

export function getPrivacyDb(): Database {
  if (dbInstance) return dbInstance;

  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "apps/web/.env.local"),
  ];

  for (const candidate of candidates) {
    loadEnvFile(candidate);
  }

  const url =
    process.env.DATABASE_URL ??
    "postgresql://lumi:lumi_local_only@localhost:15432/lumi";
  dbInstance = createDatabase(url);
  return dbInstance;
}
