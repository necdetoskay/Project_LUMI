import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const PASSWORD = "m7-browser-test-password-123";

async function createParentFixture(context: BrowserContext) {
  const request = context.request;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `m7-${suffix}@example.com`;

  const register = await request.post("/api/auth/register", {
    data: { displayName: "M7 Parent", email, password: PASSWORD, confirmPassword: PASSWORD },
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
    data: { householdId, displayName: "Lina M7", ageBand: "6-8" },
  });
  expect(child.status()).toBe(201);
  const childProfileId = (await child.json()).profile.id as string;
  const key = await request.put("/api/settings/llm", {
    data: { action: "upsert-key", householdId, apiKey: "m7-mock-openrouter-key" },
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
        action: "upsert-task", householdId, taskType,
        modelId: "mock/canonical-onboarding", reasoningLevel: "medium",
        temperature: 0.7, maxOutputTokens: 4000, enabled: true,
      },
    });
    expect(setting.status()).toBe(200);
  }
  return { householdId, childProfileId };
}

async function expectStep(page: Page, step: string) {
  await expect(page.getByTestId("canonical-onboarding-step")).toHaveAttribute("data-step", step, { timeout: 30_000 });
}

async function selectFirstCandidateAndContinue(page: Page) {
  const cards = page.getByTestId("candidate-card");
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  await cards.first().click();
  await expect(page.getByTestId("continue-step")).toBeEnabled();
  await page.getByTestId("continue-step").click();
}

test.describe("M7 canonical Character Onboarding browser E2E", () => {
  test("completes all 9 stages, persists a spoiler-safe foundation, and retries idempotently", async ({ page, context }) => {
    const { householdId, childProfileId } = await createParentFixture(context);

    await page.goto(`/app/character-onboarding?childProfileId=${encodeURIComponent(childProfileId)}`);
    await expect(page).toHaveURL(/\/characters\/new\/wizard/);
    await expectStep(page, "character_type");

    await page.getByTestId("choice-fantastic").click();
    await expect(page.getByTestId("continue-step")).toBeEnabled();
    await page.getByTestId("continue-step").click();
    await expectStep(page, "character_identity");
    await expect(page.getByTestId("generation-loading")).toBeVisible();
    await selectFirstCandidateAndContinue(page);

    await expectStep(page, "universe");
    await page.getByTestId("choice-lumi-prime").click();
    await page.getByTestId("continue-step").click();
    await expectStep(page, "world");
    await expect(page.getByTestId("candidate-card").first()).toBeVisible({ timeout: 30_000 });

    await page.reload();
    await expectStep(page, "world");
    await selectFirstCandidateAndContinue(page);
    await expectStep(page, "compatibility");
    await selectFirstCandidateAndContinue(page);

    await expectStep(page, "region");
    await expect(page.getByTestId("candidate-card").first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: "Çocuk alanına dön" }).click();
    await expect(page).toHaveURL(new RegExp(`/app/profiles/${childProfileId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await page.goBack();
    await expectStep(page, "region");
    await selectFirstCandidateAndContinue(page);

    await expectStep(page, "origin");
    await selectFirstCandidateAndContinue(page);
    await expectStep(page, "core_saga");
    await selectFirstCandidateAndContinue(page);
    await expectStep(page, "final_review");

    const review = page.getByTestId("final-review");
    await expect(review).toContainText("Luna Starwhisperer");
    await expect(review).toContainText("Starglow Forest");
    await expect(review).toContainText("Whispering Crystal Glades");
    await expect(review).toContainText("Starlight Weaver");
    await expect(review).toContainText("The Lost Melody of the Crystal Glades");

    const finalizeResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/character-creation/canonical") &&
      response.request().method() === "POST" &&
      response.request().postData()?.includes('"action":"finalize"') === true,
    );
    await page.getByTestId("finalize-character").click();
    const finalizeResponse = await finalizeResponsePromise;
    expect(finalizeResponse.status()).toBe(200);
    const committed = (await finalizeResponse.json()) as {
      characterId: string;
      worldId: string;
      foundationReview: {
        identity: { name: string };
        world: { name: string };
        region: { name: string };
        origin: { title: string };
        currentSituation: string;
        publicSaga: { title: string; premise: string; longTermGoal: string };
      };
      bootstrap: { status: string; idempotencyKey: string };
    };
    expect(committed.foundationReview.identity.name).toBe("Luna Starwhisperer");
    expect(committed.foundationReview.world.name).toBe("Starglow Forest");
    expect(committed.foundationReview.region.name).toBe("Whispering Crystal Glades");
    expect(committed.foundationReview.origin.title).toBe("Starlight Weaver");
    expect(committed.foundationReview.publicSaga.title).toBe("The Lost Melody of the Crystal Glades");
    expect(committed.foundationReview.currentSituation.length).toBeGreaterThan(0);
    expect(committed.foundationReview.publicSaga.premise.length).toBeGreaterThan(0);
    expect(JSON.stringify(committed.foundationReview)).not.toContain("deepTruth");
    expect(JSON.stringify(committed.foundationReview)).not.toContain("forbiddenEarlyReveals");
    expect(committed.bootstrap.status).toBe("planned");
    expect(committed.bootstrap.idempotencyKey).toMatch(/^living-world-bootstrap:/);

    await expect(page).toHaveURL(new RegExp(`/app/profiles/${childProfileId}/characters/[0-9a-f-]+$`), { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Luna Starwhisperer", exact: true })).toBeVisible({ timeout: 30_000 });

    const retry = await context.request.post("/api/character-creation/canonical", {
      data: { action: "finalize", householdId, childProfileId },
    });
    expect(retry.status()).toBe(200);
    const retried = (await retry.json()) as { characterId: string; worldId: string; bootstrap: { idempotencyKey: string } };
    expect(retried.characterId).toBe(committed.characterId);
    expect(retried.worldId).toBe(committed.worldId);
    expect(retried.bootstrap.idempotencyKey).toBe(committed.bootstrap.idempotencyKey);

    const cycle = await context.request.get(`/api/character-creation/canonical?householdId=${encodeURIComponent(householdId)}&childProfileId=${encodeURIComponent(childProfileId)}`);
    expect(cycle.status()).toBe(200);
    expect((await cycle.json()).cycle).toBeNull();
  });
});
