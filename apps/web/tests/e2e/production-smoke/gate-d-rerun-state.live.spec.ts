import { expect, test } from "@playwright/test";

const CHILD_PROFILE_ID = "520fa2ad-abb5-4bd7-8bc0-de1ffb1a1b95";
const CHARACTER_ID = "dd18a58e-93ec-49a6-83f5-bed6aea3729f";

test("inspect Gate D rerun persisted state read-only", async ({ page }) => {
  const email = process.env.LUMI_LONG_HORIZON_PARENT_EMAIL;
  const password = process.env.LUMI_LONG_HORIZON_PARENT_PASSWORD;
  if (!email || !password) throw new Error("Missing live parent credentials");

  const login = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(login.ok()).toBe(true);

  const onboardingResponse = await page.request.get("/api/onboarding");
  expect(onboardingResponse.ok()).toBe(true);
  const onboarding = (await onboardingResponse.json()) as {
    onboarding?: { householdId?: string };
  };
  const householdId = onboarding.onboarding?.householdId;
  expect(householdId).toBeTruthy();

  const bootstrapResponse = await page.request.get(
    `/api/characters/${CHARACTER_ID}?householdId=${householdId}&bootstrap=true`,
  );
  console.log(`LUMI_250_D2_BOOTSTRAP_HTTP=${bootstrapResponse.status()}`);
  console.log(`LUMI_250_D2_BOOTSTRAP_BODY=${JSON.stringify(await bootstrapResponse.json())}`);

  const candidatesResponse = await page.request.get(
    `/api/child-profiles/${CHILD_PROFILE_ID}/stories/adventure-candidates?householdId=${householdId}&page=0`,
  );
  console.log(`LUMI_250_D2_CANDIDATES_HTTP=${candidatesResponse.status()}`);
  console.log(`LUMI_250_D2_CANDIDATES_BODY=${JSON.stringify(await candidatesResponse.json())}`);
  expect(candidatesResponse.ok()).toBe(true);
});
