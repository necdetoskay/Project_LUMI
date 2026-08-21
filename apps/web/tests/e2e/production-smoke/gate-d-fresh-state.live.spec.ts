import { expect, test } from "@playwright/test";

const CHILD_PROFILE_ID = "167dbf4b-7944-4a1c-9d02-a291e24575b7";
const CHARACTER_ID = "97382960-2ef5-4c9b-b3ac-61f76f1ffcff";

test("inspect fresh Gate D persisted state read-only", async ({ page }) => {
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
  const bootstrapBody = await bootstrapResponse.json();
  console.log(`LUMI_250_D_BOOTSTRAP_HTTP=${bootstrapResponse.status()}`);
  console.log(`LUMI_250_D_BOOTSTRAP_BODY=${JSON.stringify(bootstrapBody)}`);

  const domainResponse = await page.request.get(
    `/api/characters/${CHARACTER_ID}?householdId=${householdId}&domain=true`,
  );
  const domainBody = await domainResponse.json();
  console.log(`LUMI_250_D_DOMAIN_HTTP=${domainResponse.status()}`);
  console.log(`LUMI_250_D_DOMAIN_BODY=${JSON.stringify(domainBody)}`);

  for (const candidatePage of [0, 1, 2]) {
    const candidatesResponse = await page.request.get(
      `/api/child-profiles/${CHILD_PROFILE_ID}/stories/adventure-candidates?householdId=${householdId}&page=${candidatePage}`,
    );
    const candidatesBody = await candidatesResponse.json();
    console.log(`LUMI_250_D_CANDIDATES_PAGE_${candidatePage}_HTTP=${candidatesResponse.status()}`);
    console.log(`LUMI_250_D_CANDIDATES_PAGE_${candidatePage}_BODY=${JSON.stringify(candidatesBody)}`);
    expect(candidatesResponse.ok()).toBe(true);
  }
});
