import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(process.cwd(), "app", "app");
const projectRoot = resolve(process.cwd(), "..", "..");

function readApp(relativePath: string) {
  return readFileSync(resolve(appRoot, relativePath), "utf8");
}

function readProject(relativePath: string) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

describe("Character Genesis Deep Origin Test Lab contract", () => {
  it("mounts an isolated Deep Origin workbench without replacing onboarding Test Lab", () => {
    const page = readApp("settings/test-lab/page.tsx");

    expect(page).toContain('import DeepOriginTestPanel from "./deep-origin-test-panel"');
    expect(page).toContain("<OnboardingTestRunner");
    expect(page).toContain("<DeepOriginTestPanel />");
  });

  it("previews and runs the production deep-origin prompt in sandbox", () => {
    const panel = readApp("settings/test-lab/deep-origin-test-panel.tsx");
    const route = readApp("../../api/settings/test-lab/genesis/origin/route.ts");

    expect(panel).toContain('action: "preview"');
    expect(panel).toContain('action: "run"');
    expect(panel).toContain("Production Deep Origin promptunu yükle");
    expect(route).toContain("previewDeepCharacterOriginPrompt");
    expect(route).toContain("generateDeepCharacterOrigins");
    expect(route).toContain('phaseId: CHARACTER_GENESIS_DEEP_ORIGIN_PHASE_ID');
  });

  it("persists prompt, raw output, parsed candidates, validation, tokens and cost evidence", () => {
    const panel = readApp("settings/test-lab/deep-origin-test-panel.tsx");
    const route = readApp("../../api/settings/test-lab/genesis/origin/route.ts");
    const types = readProject(
      "packages/ai/src/test-lab/domain/test-lab-types.ts",
    );

    expect(route).toContain("rawProviderOutput: generated.rawProviderOutput");
    expect(route).toContain("validation: generated.validation[index]");
    expect(route).toContain("createTestRunUsageSnapshot");
    expect(types).toContain("rawProviderOutput?: string | null");
    expect(panel).toContain("Raw provider output");
    expect(panel).toContain("Parsed aday");
    expect(panel).toContain("estimatedCostUsd");
  });

  it("never commits deep-origin generation directly to the canonical universe", () => {
    const route = readApp("../../api/settings/test-lab/genesis/origin/route.ts");

    expect(route).toContain("recordRunCandidates");
    expect(route).not.toContain("canonicalCommit");
    expect(route).not.toContain("worldBootstrap");
    expect(route).not.toContain("CharacterGenesisCoordinator");
  });
});
