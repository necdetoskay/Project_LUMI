import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageJsonPath = resolve(process.cwd(), "package.json");
const runnerPath = resolve(
  process.cwd(),
  "scripts/vercel-production-data-integrity-migrate.mjs",
);

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  scripts: { build: string };
};
const runnerSource = readFileSync(runnerPath, "utf8");

describe("production data-integrity migration contract", () => {
  it("delegates production integrity to the unified schema orchestrator before the Next build", () => {
    const build = packageJson.scripts.build;
    const orchestratorIndex = build.indexOf(
      "node scripts/vercel-production-schema-migrate.mjs",
    );
    const nextBuildIndex = build.indexOf("next build --webpack");

    expect(orchestratorIndex).toBeGreaterThanOrEqual(0);
    expect(nextBuildIndex).toBeGreaterThan(orchestratorIndex);
    expect(build).not.toContain(
      "node scripts/vercel-production-data-integrity-migrate.mjs",
    );
    expect(build).not.toContain(
      "node scripts/vercel-production-cross-domain-migrate.mjs",
    );
  });

  it("keeps the PR-2 through PR-7 integrity migrations in dependency order", () => {
    const expectedMigrations = [
      "0078_household_scope_constraints.sql",
      "0079_child_avatar_identity_split.sql",
      "0080_child_avatar_registry_sync.sql",
      "0012_world_npc_identity_split.sql",
      "0013_world_hierarchy_integrity.sql",
      "0002_scope_integrity.sql",
      "0010_story_integrity.sql",
      "0014_inventory_typed_ownership.sql",
    ];

    let previousIndex = -1;
    for (const migration of expectedMigrations) {
      const migrationIndex = runnerSource.indexOf(`filename: "${migration}"`);
      expect(migrationIndex).toBeGreaterThan(previousIndex);
      previousIndex = migrationIndex;
    }
  });

  it("fails closed for production builds without a database connection", () => {
    expect(runnerSource).toContain('process.env.VERCEL_ENV === "production"');
    expect(runnerSource).toContain("process.env.DATABASE_DIRECT_URL");
    expect(runnerSource).toContain("process.env.DATABASE_URL");
    expect(runnerSource).toContain("process.exit(1)");
    expect(runnerSource).toContain('await client.query("ROLLBACK")');
  });
});
