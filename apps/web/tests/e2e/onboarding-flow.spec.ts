import { expect, test, type Page } from "@playwright/test";

const mockPort = Number(process.env.MOCK_OPENROUTER_PORT ?? 18999);
const mockControlUrl = `http://127.0.0.1:${mockPort}`;
const password = "e2e-test-password-456";

type MockRequest = { kind: "archetype" | "origin"; prompt: string; model: string };

async function createParentAndProfile(page: Page) {
  const email = `e2e-ai-flow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const register = await page.request.post("/api/auth/register", {
    data: { displayName: "AI Flow Parent", email, password, confirmPassword: password },
  });
  expect(register.status()).toBe(201);

  const householdResponse = await page.request.post("/api/households", {
    data: {
      name: "AI Flow Family",
      slug: `ai-flow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
  });
  expect(householdResponse.status()).toBe(201);
  const { household } = await householdResponse.json();
  const householdId = household.id as string;

  const profileResponse = await page.request.post("/api/child-profiles", {
    data: { householdId, displayName: "AI Flow Child", ageBand: "6-8" },
  });
  expect(profileResponse.status()).toBe(201);
  const { profile } = await profileResponse.json();

  const settingsResponse = await page.request.put("/api/settings/llm", {
    data: { action: "upsert-key", householdId, apiKey: "sk-or-v1-playwright-test-key" },
  });
  expect(settingsResponse.status()).toBe(200);

  return { householdId, childProfileId: profile.id as string };
}

test.describe("AI character onboarding", () => {
  test("renders regenerated LLM archetypes, origin provenance, and no fallback on failure", async ({ page, request }) => {
    const reset = await request.post(`${mockControlUrl}/__mock/reset`);
    expect(reset.status()).toBe(200);
    const { childProfileId } = await createParentAndProfile(page);

    await page.goto(`/app/character-onboarding?childProfileId=${childProfileId}`);

    const archetypeCards = page.getByTestId("archetype-card");
    await expect(archetypeCards).toHaveCount(5, { timeout: 20_000 });
    const initialTitles = await archetypeCards.locator("p.font-bold").allTextContents();
    expect(initialTitles).toContain("Nebula Cartographer");
    await expect(page.getByText("mock-archetype-model-v1", { exact: false })).toBeVisible();

    await page.getByTestId("regenerate-archetypes").click();
    await expect(archetypeCards).toHaveCount(5, { timeout: 20_000 });
    await expect(archetypeCards.first()).toContainText("Coral Compass Diver");
    const regeneratedTitles = await archetypeCards.locator("p.font-bold").allTextContents();
    expect(regeneratedTitles).not.toEqual(initialTitles);

    const stateResponse = await request.get(`${mockControlUrl}/__mock/state`);
    const state = (await stateResponse.json()) as { requests: MockRequest[] };
    const archetypeRequests = state.requests.filter((entry) => entry.kind === "archetype");
    expect(archetypeRequests).toHaveLength(2);
    expect(archetypeRequests[1]?.prompt).toContain("Nebula Cartographer");

    await archetypeCards.first().click();
    await page.getByTestId("use-archetype").click();
    await expect(page.getByTestId("generate-origin-packages")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("generate-origin-packages").click();

    const originCards = page.getByTestId("origin-package-card");
    await expect(originCards).toHaveCount(4, { timeout: 20_000 });
    await expect(page.getByText("mock-origin-model-v1", { exact: false }).first()).toBeVisible();
    for (const card of await originCards.all()) {
      await expect(card).toContainText("AI üretimi");
      await expect(card).toContainText("mock-origin-model-v1");
    }

    const failNext = await request.post(`${mockControlUrl}/__mock/fail-next`, { data: { count: 2 } });
    expect(failNext.status()).toBe(200);
    await page.getByTestId("generate-origin-packages").click();

    await expect(page.getByTestId("origin-generation-error")).toBeVisible({ timeout: 20_000 });
    await expect(originCards).toHaveCount(0);
    await expect(page.getByText("harita perisi", { exact: false })).toHaveCount(0);
  });

  test("rejects oversized and unknown preference hints", async ({ page }) => {
    const { householdId, childProfileId } = await createParentAndProfile(page);
    const unknown = await page.request.post("/api/character-bootstrap/generate-archetypes", {
      data: { householdId, childProfileId, preferenceHints: { nested: { unsafe: true } } },
    });
    expect(unknown.status()).toBe(400);

    const oversized = await page.request.post("/api/character-bootstrap/generate-archetypes", {
      data: {
        householdId,
        childProfileId,
        preferenceHints: { favoriteThemes: Array.from({ length: 11 }, (_, index) => `theme-${index}`) },
      },
    });
    expect(oversized.status()).toBe(400);
  });
});