import { expect, test } from "@playwright/test";

const CHARACTER_ID = "04b06a36-9f72-4b95-a18a-6de3aa077423";

test("retry existing age-6 living-world bootstrap exactly once", async ({ page }) => {
  const email = process.env.LUMI_LONG_HORIZON_PARENT_EMAIL;
  const password = process.env.LUMI_LONG_HORIZON_PARENT_PASSWORD;
  if (!email || !password) throw new Error("Missing live parent credentials");

  const login = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(login.ok(), `production login failed: ${login.status()}`).toBe(true);

  const onboardingResponse = await page.request.get("/api/onboarding");
  expect(onboardingResponse.ok()).toBe(true);
  const onboarding = (await onboardingResponse.json()) as {
    onboarding?: { householdId?: string };
  };
  const householdId = onboarding.onboarding?.householdId;
  expect(householdId, "production householdId is required").toBeTruthy();

  const retryResponse = await page.request.post(
    `/api/characters/${CHARACTER_ID}?householdId=${householdId}&bootstrap=retry`,
  );
  const retryBody = await retryResponse.json();
  console.log(`LUMI_250_B_RETRY_STATUS=${retryResponse.status()}`);
  console.log(`LUMI_250_B_RETRY_BODY=${JSON.stringify(retryBody)}`);
  expect(retryResponse.ok(), JSON.stringify(retryBody)).toBe(true);
  expect(retryBody?.bootstrap?.status).toBe("completed");
});
