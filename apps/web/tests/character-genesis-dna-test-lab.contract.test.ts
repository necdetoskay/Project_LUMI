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

describe("Character Genesis DNA Test Lab contract", () => {
  it("mounts Character DNA after the existing onboarding and Deep Origin workbenches", () => {
    const page = readApp("settings/test-lab/page.tsx");

    expect(page).toContain(
      'import CharacterDnaTestPanel from "./character-dna-test-panel"',
    );
    expect(page).toContain("<OnboardingTestRunner");
    expect(page).toContain("<DeepOriginTestPanel />");
    expect(page).toContain("<CharacterDnaTestPanel />");
  });

  it("uses production evidence generation but derives numeric DNA in code", () => {
    const panel = readApp("settings/test-lab/character-dna-test-panel.tsx");
    const route = readApp("../api/settings/test-lab/genesis/dna/route.ts");
    const prompt = readProject(
      "packages/profiles/src/application/character-dna-prompt-bootstrap.service.ts",
    );

    expect(panel).toContain('action: "preview"');
    expect(panel).toContain('action: "run"');
    expect(route).toContain("generateCharacterDnaEvidence");
    expect(route).toContain("normalizeSemanticCharacterTraitEvidence");
    expect(route).toContain("createInitialCharacterTraitState");
    expect(prompt).toContain(
      "Numeric DNA uygulama kodunda deterministik türetilecek",
    );
  });

  it("records raw output, usage, derived traits and validation evidence", () => {
    const panel = readApp("settings/test-lab/character-dna-test-panel.tsx");
    const route = readApp("../api/settings/test-lab/genesis/dna/route.ts");

    expect(route).toContain("rawProviderOutput: generated.rawProviderOutput");
    expect(route).toContain("createTestRunUsageSnapshot");
    expect(route).toContain("derivedTraits");
    expect(route).toContain("validateCharacterTraitEvidenceReferences");
    expect(panel).toContain("Raw provider output");
    expect(panel).toContain("estimatedCostUsd");
  });

  it("stages traits in sandbox without direct canonical commit", () => {
    const route = readApp("../api/settings/test-lab/genesis/dna/route.ts");

    expect(route).toContain("recordRunCandidates");
    expect(route).toContain("traits: structuredClone(traits)");
    expect(route).not.toContain("canonicalCommit");
    expect(route).not.toContain("CharacterGenesisCoordinator");
  });
});
