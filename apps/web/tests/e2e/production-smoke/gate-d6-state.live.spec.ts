import { expect, test } from "@playwright/test";

const CHILD_PROFILE_ID = "6479a4e8-598b-475b-9904-fc856f7403e6";
const CHARACTER_ID = "a7c71efd-30ce-46b3-8341-026ae26d9a46";

test("inspect Gate D6 persisted state read-only", async ({ page }) => {
  const email = process.env.LUMI_LONG_HORIZON_PARENT_EMAIL;
  const password = process.env.LUMI_LONG_HORIZON_PARENT_PASSWORD;
  if (!email || !password) throw new Error("Missing live parent credentials");

  const login = await page.request.post("/api/auth/login", { data: { email, password } });
  expect(login.ok()).toBe(true);

  const onboardingResponse = await page.request.get("/api/onboarding");
  expect(onboardingResponse.ok()).toBe(true);
  const onboarding = (await onboardingResponse.json()) as { onboarding?: { householdId?: string } };
  const householdId = onboarding.onboarding?.householdId;
  expect(householdId).toBeTruthy();

  const bootstrapResponse = await page.request.get(
    `/api/characters/${CHARACTER_ID}?householdId=${householdId}&bootstrap=true`,
  );
  const bootstrapBody = await bootstrapResponse.json();
  console.log(`LUMI_250_D6_BOOTSTRAP_HTTP=${bootstrapResponse.status()}`);
  console.log(`LUMI_250_D6_BOOTSTRAP_BODY=${JSON.stringify(bootstrapBody)}`);

  const candidatesResponse = await page.request.get(
    `/api/child-profiles/${CHILD_PROFILE_ID}/stories/adventure-candidates?householdId=${householdId}&page=0`,
  );
  const candidatesBody = await candidatesResponse.json();
  console.log(`LUMI_250_D6_CANDIDATES_HTTP=${candidatesResponse.status()}`);
  console.log(`LUMI_250_D6_CANDIDATES_BODY=${JSON.stringify(candidatesBody)}`);
  expect(candidatesResponse.ok()).toBe(true);
});
