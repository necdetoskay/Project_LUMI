import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const appDir = resolve(__dirname, "..");
const repoRoot = resolve(appDir, "../..");

function source(path: string) {
  return readFileSync(resolve(appDir, path), "utf8");
}

function repoSource(path: string) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const parentHome = source("app/app/page.tsx");
const dashboardClient = source("app/app/dashboard-v2-client.tsx");
const dashboardStyles = source("app/app/dashboard-v2.module.css");
const profileLibrary = source("app/app/profiles/profiles-client-page.tsx");
const dashboardContract = JSON.parse(
  repoSource("docs/02-product/experience/dashboard-canonical-ui-v1.json"),
) as {
  contract: string;
  status: string;
  route: string;
  issues: number[];
  designLock: {
    desktopCompositionLocked: boolean;
    visualAcceptanceRequiresBrowserScreenshot: boolean;
  };
  dataRules: {
    reuseCanonicalServices: boolean;
    parallelStateAllowed: boolean;
    fakeMetricsAllowed: boolean;
    internalIdsVisible: boolean;
    technicalEnumsVisible: boolean;
  };
  responsive: {
    minimumWidthTest: number;
  };
};

const parentFacingSource = `${parentHome}\n${dashboardClient}\n${profileLibrary}`;
const forbiddenTechnicalLanguage =
  /\b(sprint\s*\d*|backend|implementation|story\/world kayıtları|sonraki sprint)\b/i;
const forbiddenGamificationLanguage =
  /\b(xp|level|quest|skill points?|görev puanı|seviye atla)\b/i;

describe("ULTEF S41 canonical parent home and child profile contract", () => {
  it("locks the approved Dashboard V2 contract as the parent-home source of truth", () => {
    expect(dashboardContract.contract).toBe("lumi-dashboard-canonical-ui-v1");
    expect(dashboardContract.status).toBe("approved");
    expect(dashboardContract.route).toBe("/app");
    expect(dashboardContract.issues).toEqual([319, 320]);
    expect(dashboardContract.designLock.desktopCompositionLocked).toBe(true);
    expect(
      dashboardContract.designLock.visualAcceptanceRequiresBrowserScreenshot,
    ).toBe(true);
  });

  it("keeps the parent home protected and anchored to canonical profile state", () => {
    expect(parentHome).toContain("getParentFromSessionToken");
    expect(parentHome).toContain("getOnboardingState(parent.id)");
    expect(parentHome).toContain("state.childProfiles[0]");
    expect(parentHome).toContain("DashboardV2Client");
    expect(parentHome).toContain('redirect("/login")');
  });

  it("provides truthful household and profile empty states", () => {
    expect(parentHome).toContain("!state.householdId || !firstProfile");
    expect(parentHome).toContain("/app/onboarding?addProfile=1");
    expect(parentHome).toContain("/app/onboarding");
    expect(profileLibrary).toContain("Henüz bir çocuk profili yok");
    expect(profileLibrary).toContain("Aile evreni henüz oluşturulmamış.");
  });

  it("binds the dashboard to existing canonical child, story, world, and personalization APIs", () => {
    expect(dashboardClient).toContain("/api/characters?");
    expect(dashboardClient).toContain("/stories?${query}");
    expect(dashboardClient).toContain("/world?${query}");
    expect(dashboardClient).toContain("/personalization?${query}");
    expect(dashboardClient).toContain("adventureHub?.ongoingAdventure");
    expect(dashboardClient).toContain("adventureHub?.pastAdventures");
    expect(dashboardContract.dataRules.reuseCanonicalServices).toBe(true);
    expect(dashboardContract.dataRules.parallelStateAllowed).toBe(false);
  });

  it("does not invent progress, metrics, world events, or internal state", () => {
    expect(dashboardContract.dataRules.fakeMetricsAllowed).toBe(false);
    expect(dashboardContract.dataRules.internalIdsVisible).toBe(false);
    expect(dashboardContract.dataRules.technicalEnumsVisible).toBe(false);
    expect(dashboardClient).toContain('value="—"');
    expect(dashboardClient).toContain(
      "LUMI burada gerçekleşmemiş olayları uydurmaz.",
    );
    expect(dashboardClient).not.toMatch(
      /Mino .*geldi|festival başladı|köprü .*yıkıldı/i,
    );
    expect(dashboardClient).not.toMatch(/%\s*\d+\s*(tamam|ilerleme)/i);
  });

  it("keeps profile management routes and API contracts reachable", () => {
    expect(profileLibrary).toContain('fetch("/api/onboarding")');
    expect(profileLibrary).toContain("/api/child-profiles?householdId=");
    expect(profileLibrary).toContain(
      "/app/profiles/${encodeURIComponent(profile.id)}",
    );
    expect(profileLibrary).toContain(
      "/app/character-onboarding?childProfileId=",
    );
    expect(dashboardClient).toContain("?section=stories");
    expect(dashboardClient).toContain("?section=characters");
    expect(dashboardClient).toContain("/app/assets");
    expect(dashboardClient).toContain("/app/settings");
  });

  it("keeps parent-facing copy free of implementation and game-system framing", () => {
    expect(parentFacingSource).not.toMatch(forbiddenTechnicalLanguage);
    expect(parentFacingSource).not.toMatch(forbiddenGamificationLanguage);
  });

  it("keeps the approved desktop shell responsive down to the mobile contract", () => {
    expect(dashboardStyles).toContain(
      "grid-template-columns: 244px minmax(0, 1fr)",
    );
    expect(dashboardStyles).toContain("@media (max-width: 860px)");
    expect(dashboardStyles).toContain("@media (max-width: 560px)");
    expect(dashboardContract.responsive.minimumWidthTest).toBe(360);
    expect(profileLibrary).toContain("md:grid-cols-2");
  });
});
