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
    expect(page).toContain("<OnboardingTestRunner />");
    expect(page).not.toContain("CanonicalTestLabDashboard");
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
});
