import { expect, test, type Page } from "@playwright/test";

const TEST_PASSWORD = "e2e-test-password-123";

async function createAuthenticatedProfile(page: Page) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-stories-preparing-${suffix}@example.com`;

  const register = await page.request.post("/api/auth/register", {
    data: {
      displayName: "Stories Retry Parent",
      email,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
    },
  });
  expect(register.status()).toBe(201);

  const login = await page.request.post("/api/auth/login", {
    data: { email, password: TEST_PASSWORD, rememberMe: true },
  });
  expect(login.status()).toBe(200);

  const household = await page.request.post("/api/households", {
    data: { name: "Stories Retry Family", slug: `stories-retry-${suffix}` },
  });
  expect(household.status()).toBe(201);
  const householdId = (await household.json()).household.id as string;

  const child = await page.request.post("/api/child-profiles", {
    data: { householdId, displayName: "Işıl", ageBand: "6-8" },
  });
  expect(child.status()).toBe(201);
  const childProfileId = (await child.json()).profile.id as string;
  return { householdId, childProfileId };
}

test("New Adventure keeps polling preparing empty window until candidates appear", async ({ page }) => {
  const { childProfileId, householdId } = await createAuthenticatedProfile(page);
  let candidateRequests = 0;

  await page.route(
    `**/api/child-profiles/${childProfileId}/stories?householdId=${householdId}`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          adventureHub: {
            character: { id: "character-retry-e2e", name: "Işıl" },
            ongoingAdventure: null,
            pastAdventures: [],
          },
        }),
      });
    },
  );

  await page.route(
    `**/api/child-profiles/${childProfileId}/stories/adventure-candidates**`,
    async (route) => {
      candidateRequests += 1;
      if (candidateRequests <= 2) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            candidates: [],
            page: 0,
            hasMoreUnseen: false,
            readiness: "preparing",
            bootstrapStatus: "completed",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          candidates: [
            {
              id: "world-retry-0",
              sourceFamily: "world_event",
              title: "Hazır olan dünya olayı",
              teaser: "Hazırlık bittikten sonra görünen gerçek aday.",
              ctaKey: "chooseWorldEvent",
              image: null,
            },
          ],
          page: 0,
          hasMoreUnseen: false,
          readiness: "ready",
          bootstrapStatus: "completed",
        }),
      });
    },
  );

  await page.goto(`/app/profiles/${childProfileId}`);
  await page.getByRole("button", { name: "auto_stories Hikâyeler", exact: true }).click();
  await page.getByRole("button", { name: "Yeni Macera" }).first().click();

  await expect(page.getByTestId("adventure-candidate")).toHaveCount(1, {
    timeout: 15_000,
  });
  await expect(page.getByText("Hazır olan dünya olayı")).toBeVisible();
  expect(candidateRequests).toBeGreaterThanOrEqual(3);
});
