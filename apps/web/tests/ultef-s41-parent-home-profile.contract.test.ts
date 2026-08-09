import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const appDir = resolve(__dirname, "..");

function source(path: string) {
  return readFileSync(resolve(appDir, path), "utf8");
}

const parentHome = source("app/app/page.tsx");
const profileLibrary = source("app/app/profiles/profiles-client-page.tsx");
const combined = `${parentHome}\n${profileLibrary}`;

const forbiddenTechnicalLanguage =
  /\b(sprint\s*\d*|backend|implementation|dashboard|story\/world kayıtları|sonraki sprint)\b/i;
const forbiddenGamificationLanguage =
  /\b(xp|level|quest|skill points?|görev puanı|seviye atla)\b/i;

describe("ULTEF S41 parent home and child profile contract", () => {
  it("centers the parent home on children and their story worlds", () => {
    expect(parentHome).toContain("Ailenizin hikâye evi");
    expect(parentHome).toContain("Çocuklarım");
    expect(parentHome).toContain("Her çocuk için ayrı bir dünya");
    expect(parentHome).toContain("state.childProfiles.map");
    expect(parentHome).toContain("/app/character-onboarding?childProfileId=");
  });

  it("provides truthful household/profile empty states", () => {
    expect(parentHome).toContain("İlk çocuk profilini oluşturalım");
    expect(parentHome).toContain("/app/onboarding");
    expect(profileLibrary).toContain("Henüz bir çocuk profili yok");
    expect(profileLibrary).toContain("Aile evreni henüz oluşturulmamış.");
  });

  it("introduces Dünyalardan Haberler without fabricating world events", () => {
    expect(parentHome).toContain("Dünyalardan Haberler");
    expect(parentHome).toContain("uydurma haber göstermiyor");
    expect(parentHome).toContain("doğrulanmış bir dünya olayı akışı yok");
    expect(parentHome).not.toMatch(/Mino .*geldi|festival başladı|köprü .*yıkıldı/i);
  });

  it("keeps profile management routes and API contracts reachable", () => {
    expect(profileLibrary).toContain('fetch("/api/onboarding")');
    expect(profileLibrary).toContain("/api/child-profiles?householdId=");
    expect(profileLibrary).toContain("/app/profiles/${encodeURIComponent(profile.id)}");
    expect(profileLibrary).toContain("/app/character-onboarding?childProfileId=");
  });

  it("removes technical and game framing from parent-facing copy", () => {
    expect(combined).not.toMatch(forbiddenTechnicalLanguage);
    expect(combined).not.toMatch(forbiddenGamificationLanguage);
  });

  it("uses responsive storybook surfaces instead of fixed dashboard grids", () => {
    expect(parentHome).toContain("storybook-page");
    expect(parentHome).toContain("md:grid-cols-2");
    expect(parentHome).toContain("xl:grid-cols-3");
    expect(profileLibrary).toContain("storybook-page");
    expect(profileLibrary).toContain("md:grid-cols-2");
  });
});
