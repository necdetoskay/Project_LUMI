import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REQUIRED_WEB_BUILD_ENVS = [
  "DATABASE_URL",
  "OPENROUTER_API_KEY",
  "AUTH_COOKIE_SECURE",
  "LUMI_SETTINGS_ENCRYPTION_KEY",
  "CLOUDFLARE_R2_BUCKET",
  "OBJECT_STORAGE_ENDPOINT",
  "OBJECT_STORAGE_BUCKET",
  "OBJECT_STORAGE_ACCESS_KEY_ID",
  "OBJECT_STORAGE_SECRET_ACCESS_KEY",
  "OBJECT_STORAGE_REGION",
  "OBJECT_STORAGE_PUBLIC_URL",
] as const;

describe("Turborepo web build env contract", () => {
  it("declares every production web build env name without embedding secret values", () => {
    const turboPath = resolve(process.cwd(), "../../turbo.json");
    const turbo = JSON.parse(readFileSync(turboPath, "utf8")) as {
      tasks?: { build?: { env?: string[] } };
    };

    const buildEnv = turbo.tasks?.build?.env ?? [];

    for (const envName of REQUIRED_WEB_BUILD_ENVS) {
      expect(buildEnv).toContain(envName);
    }

    expect(buildEnv.every((entry) => /^[A-Z0-9_]+$/.test(entry))).toBe(true);
  });
});
