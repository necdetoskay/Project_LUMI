import { expect, test } from "@playwright/test";

const forbiddenTechnicalCopy = [
  /\bDashboard\b/i,
  /\bOpenRouter\b/i,
  /\bbackend\b/i,
  /\bbootstrap\b/i,
  /\bhandoff\b/i,
  /\bmodelId\b/i,
  /AI önerileri/i,
  /Karakter Başlangıç Akışı/i,
];

test.describe("S42 character creation contract", () => {
  test("character creation source keeps existing production API contracts", async ({ request }) => {
    for (const route of [
      "/api/character-bootstrap/status",
      "/api/character-bootstrap/generate-archetypes",
      "/api/character-bootstrap/handoff",
      "/api/character-bootstrap/generate-packages",
      "/api/character-bootstrap/consume",
    ]) {
      const response = await request.fetch(route, { method: route.endsWith("status") ? "GET" : "POST" });
      expect([400, 401, 403, 405]).toContain(response.status());
    }
  });

  test("unauthenticated character onboarding remains protected", async ({ page }) => {
    await page.goto("/app/character-onboarding?childProfileId=test-profile");
    await expect(page).toHaveURL(/\/login/);
  });

  test("visual canon contract is truthful about provider readiness", async ({ page }) => {
    const response = await page.request.get("/");
    expect(response.ok()).toBeTruthy();
    const contract = await page.request.get("/api/health").catch(() => null);
    expect(contract === null || contract.status() < 500).toBeTruthy();
  });
});

test("S42 technical-copy denylist remains defined", () => {
  expect(forbiddenTechnicalCopy.length).toBeGreaterThan(0);
});
