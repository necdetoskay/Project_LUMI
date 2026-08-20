import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const ROUTE = resolve(
  root,
  "app/api/settings/test-lab/genesis/migration/route.ts",
);
const PAGE = resolve(root, "app/app/settings/test-lab/page.tsx");

describe("existing-character migration Test Lab contract", () => {
  it("reuses the canonical migration policy and never mutates production state", async () => {
    const source = await readFile(ROUTE, "utf8");

    expect(source).toContain("auditExistingCharacterGenesis");
    expect(source).toContain("createExistingCharacterMigrationPlan");
    expect(source).toContain("buildExistingCharacterMigrationCandidate");
    expect(source).toContain("validateCharacterGenesisCrossDomain");
    expect(source).toContain("createExistingCharacterRollbackManifest");
    expect(source).toContain("canonicalMutationPerformed: false");
    expect(source).toContain("automaticPromotionAllowed: false");
    expect(source).toContain("sourceHistoryPreserved: true");
    expect(source).not.toContain("canonicalCommitter.commit");
    expect(source).not.toContain("ExistingCharacterMigrationCoordinator(");
  });

  it("persists provenance, conflicts, before/after and rollback evidence in the sandbox run", async () => {
    const source = await readFile(ROUTE, "utf8");

    expect(source).toContain("provenance:");
    expect(source).toContain("conflicts: plan.conflicts");
    expect(source).toContain("before:");
    expect(source).toContain("after:");
    expect(source).toContain("rollbackPreview");
    expect(source).toContain("existingCharacterMigrationQualification");
    expect(source).toContain('qualificationMode: "mature_sandbox_replay"');
  });

  it("mounts migration qualification after the Genesis quality journey", async () => {
    const source = await readFile(PAGE, "utf8");
    const qualification = source.indexOf("<GenesisQualificationPanel />");
    const migration = source.indexOf(
      'phaseId="character_genesis_existing_character_migration"',
    );

    expect(qualification).toBeGreaterThanOrEqual(0);
    expect(migration).toBeGreaterThan(qualification);
    expect(source).toContain(
      'endpoint="/api/settings/test-lab/genesis/migration"',
    );
    expect(source).toContain("Existing Character Migration / Safe Backfill");
  });
});
