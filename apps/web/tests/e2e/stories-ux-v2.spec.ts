import { expect, test, type Page } from "@playwright/test";

const TEST_PASSWORD = "e2e-test-password-123";

type Locale = "tr" | "en";

async function createAuthenticatedProfile(page: Page, label: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-stories-${label}-${suffix}@example.com`;

  const register = await page.request.post("/api/auth/register", {
    data: {
      displayName: "Stories E2E Parent",
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
    data: { name: "Stories E2E Family", slug: `stories-${label}-${suffix}` },
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

async function setLocale(page: Page, locale: Locale) {
  await page.goto("/login");
  await page.evaluate((value) => {
    document.cookie = `lumi-ui-locale=${value}; Path=/; SameSite=Lax`;
  }, locale);
}

async function openStoriesTab(page: Page, childProfileId: string) {
  await page.goto(`/app/profiles/${childProfileId}`);
  await page
    .getByRole("button", { name: "auto_stories Hikâyeler", exact: true })
    .click();
}

function candidateSet(pageIndex: number) {
  const suffix = pageIndex === 0 ? "" : ` ${pageIndex + 1}`;
  return [
    {
      id: `world-${pageIndex}`,
      sourceFamily: "world_event",
      title: `Parlayan orman${suffix}`,
      teaser: "Uzakta yeni bir ışık belirdi.",
    },
    {
      id: `rumor-${pageIndex}`,
      sourceFamily: "rumor",
      title: `Fısıltı${suffix}`,
      teaser: "Kasabada merak uyandıran bir söylenti dolaşıyor.",
    },
    {
      id: `item-${pageIndex}`,
      sourceFamily: "inventory_item",
      title: `Pusulanın sırrı${suffix}`,
      teaser: "Çantandaki pusula beklenmedik bir yönü gösteriyor.",
    },
    {
      id: `npc-${pageIndex}`,
      sourceFamily: "npc_call",
      title: `Mira çağırıyor${suffix}`,
      teaser: "Mira senden yardım istiyor.",
    },
  ];
}

async function mockStoriesApis(
  page: Page,
  childProfileId: string,
  householdId: string,
) {
  let refreshPage = -1;
  let startedCandidateId: string | null = null;

  await page.route(
    `**/api/child-profiles/${childProfileId}/stories?householdId=${householdId}`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          adventureHub: {
            character: { id: "character-e2e", name: "Işıl" },
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
      const url = new URL(route.request().url());
      refreshPage = Number(url.searchParams.get("page") ?? "0");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ candidates: candidateSet(refreshPage) }),
      });
    },
  );

  await page.route(
    `**/api/child-profiles/${childProfileId}/stories/start-adventure`,
    async (route) => {
      const payload = route.request().postDataJSON() as {
        householdId: string;
        candidateId: string;
        idempotencyKey: string;
      };
      expect(payload.householdId).toBe(householdId);
      expect(payload.idempotencyKey).toBeTruthy();
      startedCandidateId = payload.candidateId;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessionId: "e2e-session" }),
      });
    },
  );

  await page.route("**/app/stories/e2e-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body><h1>Stories E2E session</h1></body></html>",
    });
  });

  return {
    getRefreshPage: () => refreshPage,
    getStartedCandidateId: () => startedCandidateId,
  };
}

async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewport);
}

test.describe("Stories UX v2 governed browser coverage", () => {
  test("TR desktop: empty state, localized source families, refresh and Escape focus restore", async ({
    page,
  }) => {
    await setLocale(page, "tr");
    const { childProfileId, householdId } = await createAuthenticatedProfile(
      page,
      "tr-desktop",
    );
    const mocked = await mockStoriesApis(page, childProfileId, householdId);

    await openStoriesTab(page, childProfileId);

    await expect(
      page.getByRole("heading", { name: /Işıl.*Maceraları/ }),
    ).toBeVisible();
    await expect(
      page.getByText("Yeni bir maceraya hazır mısın?"),
    ).toBeVisible();
    const trigger = page.getByRole("button", { name: "Yeni Macera" }).first();
    await trigger.focus();
    await trigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Kapat", exact: true }),
    ).toBeFocused();
    await expect(page.getByText("Dünyada Bir Şey Oldu")).toBeVisible();
    await expect(page.getByText("Bir Söylenti Duydun")).toBeVisible();
    await expect(page.getByText("Çantandaki Bir Eşya")).toBeVisible();
    await expect(page.getByText("Birinden Gelen Çağrı")).toBeVisible();

    await page.getByRole("button", { name: "Başka maceralar göster" }).click();
    await expect(page.getByText("Parlayan orman 2")).toBeVisible();
    expect(mocked.getRefreshPage()).toBe(1);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("EN 360px: no overflow, keyboard-operable sheet and world-event start payload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await setLocale(page, "en");
    const { childProfileId, householdId } = await createAuthenticatedProfile(
      page,
      "en-mobile",
    );
    const mocked = await mockStoriesApis(page, childProfileId, householdId);

    await openStoriesTab(page, childProfileId);
    await expect(
      page.getByRole("heading", { name: "Işıl's Adventures" }),
    ).toBeVisible();
    await expect(page.getByText("Ready for a new adventure?")).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "New Adventure" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      page.getByText("Something Happened in the World"),
    ).toBeVisible();
    await expect(page.getByText("An Item in Your Bag")).toBeVisible();
    await expect(page.getByText("A Call from Someone")).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const closeButton = page.getByRole("button", { name: "Close" });
    const refreshButton = page.getByRole("button", {
      name: "Show other adventures",
    });
    await closeButton.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(refreshButton).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();

    await page.getByRole("button", { name: "Follow this clue" }).click();
    await page.waitForURL("**/app/stories/e2e-session");
    expect(mocked.getStartedCandidateId()).toBe("world-0");
  });
});
