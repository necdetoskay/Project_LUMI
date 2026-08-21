import { expect, test } from "@playwright/test";

const childProfileId = process.env.LUMI_FINALIZE_DIAGNOSTIC_CHILD_PROFILE_ID;
const parentEmail = process.env.LUMI_LONG_HORIZON_PARENT_EMAIL;
const parentPassword = process.env.LUMI_LONG_HORIZON_PARENT_PASSWORD;

if (!childProfileId || !parentEmail || !parentPassword) {
  throw new Error(
    "Finalize diagnostic requires child profile id and live parent credentials.",
  );
}

test("diagnose persistent final-review finalize response", async ({ page }) => {
  await page.goto("/login");
  const loginForm = page.locator('form[action="/api/auth/login"]');
  await expect(loginForm).toBeVisible({ timeout: 60_000 });
  await loginForm.locator('input[name="email"]').fill(parentEmail);
  await loginForm.locator('input[name="password"]').fill(parentPassword);
  await Promise.all([
    page.waitForURL(/\/app(?:[/?#]|$)/, { timeout: 60_000 }),
    loginForm.locator('button[type="submit"]').click(),
  ]);

  await page.goto(
    `/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/wizard`,
  );
  await expect(page.getByTestId("canonical-onboarding-step")).toHaveAttribute(
    "data-step",
    "final_review",
    { timeout: 60_000 },
  );

  const finalizeResponse = page.waitForResponse(
    (response) => {
      if (
        !response.url().endsWith("/api/character-creation/canonical") ||
        response.request().method() !== "POST"
      ) {
        return false;
      }
      try {
        const payload = response.request().postDataJSON() as { action?: string };
        return payload.action === "finalize";
      } catch {
        return false;
      }
    },
    { timeout: 60_000 },
  );

  await page.getByTestId("finalize-character").click();
  const response = await finalizeResponse;
  const responseText = await response.text();
  console.log(`FINALIZE_DIAGNOSTIC_STATUS=${response.status()}`);
  console.log(`FINALIZE_DIAGNOSTIC_BODY=${responseText}`);

  if (!response.ok()) {
    throw new Error(
      `FINALIZE_PRODUCT_ERROR ${response.status()}: ${responseText.slice(0, 1500)}`,
    );
  }

  await expect(page).toHaveURL(
    /\/app\/profiles\/[^/?#]+\/characters\/[^/?#]+\/?$/,
    { timeout: 60_000 },
  );
});
