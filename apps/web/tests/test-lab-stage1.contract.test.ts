import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(process.cwd(), "app", "app");

function read(relativePath: string) {
  return readFileSync(resolve(appRoot, relativePath), "utf8");
}

describe("Test Lab stage 1 contract", () => {
  it("exposes Test Lab from the main dashboard", () => {
    const source = read("page.tsx");
    expect(source).toContain('href="/app/settings/test-lab"');
    expect(source).toContain("Test Lab");
  });

  it("uses the real onboarding runner as the primary Test Lab surface", () => {
    const page = read("settings/test-lab/page.tsx");
    expect(page).toContain(
      'import OnboardingTestRunner from "./onboarding-test-runner"',
    );
    expect(page).toContain("<OnboardingTestRunner");
    expect(page).not.toContain("CanonicalTestLabDashboard");
  });

  it("loads real household and child profile records for selection", () => {
    const page = read("settings/test-lab/page.tsx");
    const runner = read("settings/test-lab/onboarding-test-runner.tsx");

    expect(page).toContain("getOnboardingState(parent.id)");
    expect(page).toContain("state.childProfiles.map");
    expect(runner).toContain("Aile alanı");
    expect(runner).toContain("Çocuk profili");
    expect(runner).toContain("<select");
    expect(runner).not.toContain("Household ID");
    expect(runner).not.toContain("Child Profile ID");
    expect(runner).toContain("lumi.testLab.householdId");
    expect(runner).toContain("lumi.testLab.childProfileId");
  });

  it("keeps the manual production-backed onboarding workflow visible", () => {
    const runner = read("settings/test-lab/onboarding-test-runner.tsx");
    expect(runner).toContain("OpenRouter model slug");
    expect(runner).toContain('action: "create-session"');
    expect(runner).toContain('action: "run-phase"');
    expect(runner).toContain('action: "select-candidate"');
    expect(runner).toContain("Bu adayı seç ve sonraki aşamaya geç");
    expect(runner).not.toContain("7 / 7 seçildi");
  });

  it("lets Test Lab override output locale explicitly", () => {
    const runner = read("settings/test-lab/onboarding-test-runner.tsx");
    expect(runner).toContain("lumi.testLab.locale");
    expect(runner).toContain('<option value="tr">Türkçe</option>');
    expect(runner).toContain('<option value="en">English</option>');
    expect(runner).toContain("generationConfig: { outputLocale: locale }");
  });

  it("retains each phase result while navigating between onboarding phases", () => {
    const runner = read("settings/test-lab/onboarding-test-runner.tsx");
    expect(runner).toContain("resultsByPhase");
    expect(runner).toContain("setResultsByPhase");
    expect(runner).toContain("resultsByPhase[phaseId]");
    expect(runner).toContain("sonuçları gör");
    expect(runner).not.toContain("setResult(null)");
  });

  it("uses centralized application theme tokens instead of page-local colors", () => {
    const runner = read("settings/test-lab/onboarding-test-runner.tsx");
    const theme = read("settings/test-lab/test-lab-runner.module.css");

    expect(runner).toContain(
      'import styles from "./test-lab-runner.module.css"',
    );
    expect(runner).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(theme).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(theme).not.toMatch(/\brgba?\(/i);
    expect(theme).not.toMatch(/\bhsla?\(/i);
    expect(theme).toContain("var(--on-surface)");
    expect(theme).toContain("var(--surface-container-lowest)");
    expect(theme).toContain("var(--primary)");
    expect(theme).toContain("var(--outline-variant)");
  });
});
