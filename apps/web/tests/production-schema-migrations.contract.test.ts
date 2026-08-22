import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const webRoot = process.cwd().endsWith("apps/web")
  ? process.cwd()
  : resolve(process.cwd(), "apps/web");
const packageJson = JSON.parse(
  readFileSync(resolve(webRoot, "package.json"), "utf8"),
) as { scripts: { build: string } };
const runner = readFileSync(
  resolve(webRoot, "scripts/vercel-production-schema-migrate.mjs"),
  "utf8",
);

describe("production schema migration contract", () => {
  it("routes the production build through one migration orchestrator", () => {
    expect(packageJson.scripts.build).toBe(
      "node scripts/vercel-production-schema-migrate.mjs && next build --webpack",
    );
    expect(packageJson.scripts.build).not.toContain(
      "vercel-production-data-integrity-migrate.mjs",
    );
    expect(packageJson.scripts.build).not.toContain(
      "vercel-production-cross-domain-migrate.mjs",
    );
  });

  it("runs every schema domain in dependency order", () => {
    const expectedOrder = [
      '["auth", "@lumi/web", "auth:migrate"]',
      '["profiles", "@lumi/profiles", "profile:migrate"]',
      '["world", "@lumi/world", "world:migrate"]',
      '["story", "@lumi/story", "story:migrate"]',
      '["simulation", "@lumi/simulation", "simulation:migrate"]',
      '["privacy", "@lumi/privacy", "privacy:migrate"]',
      '["media", "@lumi/media", "media:migrate"]',
      '["ai", "@lumi/ai", "ai:migrate"]',
      '["prompts", "@lumi/prompts", "prompt:migrate"]',
    ];

    let previous = -1;
    for (const entry of expectedOrder) {
      const index = runner.indexOf(entry);
      expect(index).toBeGreaterThan(previous);
      previous = index;
    }
  });

  it("only destructively resets an unmarked legacy schema", () => {
    expect(runner).toContain('return { kind: "unmarked" }');
    expect(runner).toContain('generationState.kind === "unmarked"');
    expect(runner).toContain("Unsupported production schema generation");
    expect(runner).toContain("DROP SCHEMA IF EXISTS profile CASCADE");
    expect(runner).toContain("DROP SCHEMA IF EXISTS story CASCADE");
    expect(runner).toContain("DROP SCHEMA IF EXISTS simulation CASCADE");
    expect(runner).toContain("DROP TABLE IF EXISTS public.parent_accounts CASCADE");
  });

  it("marks the database managed only after migration verification", () => {
    const verifyIndex = runner.indexOf("await verifySchema(client)");
    const markerIndex = runner.indexOf("await writeGenerationMarker(client)");

    expect(verifyIndex).toBeGreaterThan(-1);
    expect(markerIndex).toBeGreaterThan(verifyIndex);
    expect(runner).toContain(
      "Production profile migration ledger is missing required integrity migrations.",
    );
  });
});
