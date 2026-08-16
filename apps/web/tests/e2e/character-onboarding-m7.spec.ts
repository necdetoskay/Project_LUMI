import { expect, test, type BrowserContext } from "@playwright/test";

const PASSWORD = "m7-browser-test-password-123";

async function createParentFixture(context: BrowserContext) {
  const request = context.request;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `m7-${suffix}@example.com`;

  const register = await request.post("/api/auth/register", {
    data: {
      displayName: "M7 Parent",
      email,
      password: PASSWORD,
      confirmPassword: PASSWORD,
    },
  });
  expect(register.status()).toBe(201);

  const login = await request.post("/api/auth/login", {
    data: { email, password: PASSWORD, rememberMe: true },
  });
  expect(login.status()).toBe(200);

  const household = await request.post("/api/households", {
    data: { name: "M7 Family", slug: `m7-family-${suffix}` },
  });
  expect(household.status()).toBe(201);
  const householdId = (await household.json()).household.id as string;

  const child = await request.post("/api/child-profiles", {
    data: {
      householdId,
      displayName: "Lina M7",
      ageBand: "6-8",
    },
  });
  expect(child.status()).toBe(201);
  const childProfileId = (await child.json()).profile.id as string;

  const key = await request.put("/api/settings/llm", {
    data: {
      action: "upsert-key",
      householdId,
      apiKey: "m7-mock-openrouter-key",
    },
  });
  expect(key.status()).toBe(200);

  for (const taskType of [
    "character_identity_suggestions",
    "character_world_suggestions",
    "character_world_compatibility",
    "character_region_suggestions",
    "character_origin_suggestions",
    "character_core_saga",
  ]) {
    const setting = await request.put("/api/settings/llm", {
      data: {
        action: "upsert-task",
        householdId,
        taskType,
        modelId: "mock/canonical-onboarding",
        reasoningLevel: "medium",
        temperature: 0.7,
        maxOutputTokens: 4000,
        enabled: true,
      },
    });
    expect(setting.status()).toBe(200);
  }

  return { householdId, childProfileId };
}

async function expectStep(page: import("@playwright/test").Page, step: string) {
  await expect(page.getByTestId("canonical-onboarding-step")).toHaveAttribute(
    "data-step",
    step,
    { timeout: 30_000 },
  );
}

async function selectFirstCandidateAndContinue(
  page: import("@playwright/test").Page,
) {
  const cards = page.getByTestId("candidate-card");
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  await cards.first().click();
  await expect(page.getByTestId("continue-step")).toBeEnabled();
  await page.getByTestId("continue-step").click();
}

test.describe("M7 canonical Character Onboarding browser E2E", () => {
  test("completes all 9 stages, survives refresh/back, and opens committed character", async ({
    page,
    context,
  }) => {
    const { householdId, childProfileId } = await createParentFixture(context);

    await page.goto(
      `/app/character-onboarding?childProfileId=${encodeURIComponent(childProfileId)}`,
    );
    await expect(page).toHaveURL(/\/characters\/new\/wizard/);
    await expectStep(page, "character_type");

    await page.getByTestId("choice-fantastic").click();
    await expect(page.getByTestId("continue-step")).toBeEnabled();
    await page.getByTestId("continue-step").click();

    await expectStep(page, "character_identity");
    await selectFirstCandidateAndContinue(page);

    await expectStep(page, "universe");
    await page.getByTestId("choice-lumi-prime").click();
    await page.getByTestId("continue-step").click();

    await expectStep(page, "world");
    await expect(page.getByTestId("candidate-card").first()).toBeVisible({
      timeout: 30_000,
    });

    // Refresh must rehydrate the same persisted cycle instead of restarting it.
    await page.reload();
    await expectStep(page, "world");
    await selectFirstCandidateAndContinue(page);

    await expectStep(page, "compatibility");
    await selectFirstCandidateAndContinue(page);

    await expectStep(page, "region");
    await expect(page.getByTestId("candidate-card").first()).toBeVisible({
      timeout: 30_000,
    });

    // Leave the wizard and use browser Back. The persisted step must resume.
    await page.getByRole("link", { name: "Çocuk alanına dön" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/app/profiles/${childProfileId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    );
    await page.goBack();
    await expectStep(page, "region");
    await selectFirstCandidateAndContinue(page);

    await expectStep(page, "origin");
    await selectFirstCandidateAndContinue(page);

    await expectStep(page, "core_saga");
    await selectFirstCandidateAndContinue(page);

    await expectStep(page, "final_review");
    await expect(page.getByTestId("final-review")).toContainText(
      "Luna Starwhisperer",
    );
    await expect(page.getByTestId("final-review")).toContainText(
      "Starglow Forest",
    );
    await expect(page.getByTestId("final-review")).toContainText(
      "Whispering Crystal Glades",
    );
    await expect(page.getByTestId("final-review")).toContainText(
      "Starlight Weaver",
    );
    await expect(page.getByTestId("final-review")).toContainText(
      "The Lost Melody of the Crystal Glades",
    );

    await page.getByTestId("finalize-character").click();
    await expect(page).toHaveURL(
      new RegExp(`/app/profiles/${childProfileId}/characters/[0-9a-f-]+$`),
      { timeout: 30_000 },
    );
    await expect(page.getByText("Luna Starwhisperer", { exact: false })).toBeVisible({
      timeout: 30_000,
    });

    // The draft cycle must be gone after final commit.
    const cycle = await context.request.get(
      `/api/character-creation/canonical?householdId=${encodeURIComponent(householdId)}&childProfileId=${encodeURIComponent(childProfileId)}`,
    );
    expect(cycle.status()).toBe(200);
    expect((await cycle.json()).cycle).toBeNull();
  });
});
