import { expect, test } from "@playwright/test";

test.describe("S42 character creation runtime contract", () => {
  test("unauthenticated character onboarding remains protected", async ({ page }) => {
    await page.goto("/app/character-onboarding?childProfileId=test-profile");
    await expect(page).toHaveURL(/\/login/);
  });

  test("character bootstrap endpoints remain protected", async ({ request }) => {
    const statusResponse = await request.get(
      "/api/character-bootstrap/status?householdId=test&childProfileId=test",
    );
    expect([400, 401, 403]).toContain(statusResponse.status());

    for (const endpoint of [
      "/api/character-bootstrap/generate-archetypes",
      "/api/character-bootstrap/handoff",
      "/api/character-bootstrap/generate-packages",
      "/api/character-bootstrap/consume",
    ]) {
      const response = await request.post(endpoint, { data: {} });
      expect([400, 401, 403]).toContain(response.status());
    }
  });
});
