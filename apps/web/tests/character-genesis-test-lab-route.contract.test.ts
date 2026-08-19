import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routePath = resolve(
  process.cwd(),
  "app",
  "api",
  "settings",
  "test-lab",
  "genesis",
  "route.ts",
);

describe("Character Genesis Test Lab route contract", () => {
  it("persists genesis as a sandbox candidate without canonical commit wiring", () => {
    const source = readFileSync(routePath, "utf8");

    expect(source).toContain("stageCharacterGenesisSandboxCandidate");
    expect(source).toContain("coordinator.recordCandidate");
    expect(source).toContain("CHARACTER_GENESIS_TEST_LAB_PHASE_ID");
    expect(source).toContain("assertSandboxOwner");
    expect(source).toContain("CHARACTER_ONBOARDING_SCENARIO.key");
    expect(source).not.toContain("CharacterGenesisCanonicalCommitPort");
    expect(source).not.toContain("createWorldFromOrigin");
  });
});
