import { test, expect } from "@playwright/test";

const TEST_PASSWORD = "e2e-test-password-123";
const PRIMARY_RGB = "rgb(91, 53, 229)";
const ON_PRIMARY_RGB = "rgb(255, 255, 255)";
const ON_SURFACE_RGB = "rgb(28, 26, 36)";

function createTestIdentity(label: string) {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    email: `e2e-theme-${normalized}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: TEST_PASSWORD,
  };
}

let householdCounter = 0;
function uniqueSlug(label: string): string {
  householdCounter++;
  return `e2e-theme-${label}-${Date.now()}-${householdCounter}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

test.describe("theme visual smoke", () => {
  test("static favicon is served", async ({ request }) => {
    const response = await request.get("/favicon.ico");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/x-icon");
  });
  test("landing page CTA: bg-primary text-on-primary", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cta = page.locator('a[href="/register"]').filter({ hasText: "Ebeveyn hesabı" });
    await expect(cta).toBeVisible();

    const bg = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);
    const color = await cta.evaluate((el) => getComputedStyle(el).color);

    expect(bg).toBe(PRIMARY_RGB);
    expect(color).toBe(ON_PRIMARY_RGB);
  });

  test("login page: submit button bg-primary, password toggle NOT bg-primary", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const submit = page.locator('button[type="submit"]').filter({ hasText: "Giriş yap" });
    await expect(submit).toBeVisible();

    const submitBg = await submit.evaluate((el) => getComputedStyle(el).backgroundColor);
    const submitColor = await submit.evaluate((el) => getComputedStyle(el).color);
    expect(submitBg).toBe(PRIMARY_RGB);
    expect(submitColor).toBe(ON_PRIMARY_RGB);

    const toggle = page.locator('button[aria-label="Şifre görünürlüğü"]');
    await expect(toggle).toBeVisible();

    const toggleBg = await toggle.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(toggleBg).not.toBe(PRIMARY_RGB);
  });

  test("register page: submit button bg-primary text-on-primary", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const submit = page.locator('button[type="submit"]').filter({ hasText: "Hesap Oluştur" });
    await expect(submit).toBeVisible();

    const bg = await submit.evaluate((el) => getComputedStyle(el).backgroundColor);
    const color = await submit.evaluate((el) => getComputedStyle(el).color);
    expect(bg).toBe(PRIMARY_RGB);
    expect(color).toBe(ON_PRIMARY_RGB);
  });

  test("profiles page: Turkish copy regression", async ({ page }) => {
    const identity = createTestIdentity("profile-copy");
    const request = page.request;

    const registerRes = await request.post("/api/auth/register", {
      data: {
        displayName: "E2E Theme",
        email: identity.email,
        password: identity.password,
        confirmPassword: identity.password,
      },
    });
    expect(registerRes.status()).toBe(201);

    const loginRes = await request.post("/api/auth/login", {
      data: { email: identity.email, password: identity.password, rememberMe: true },
    });
    expect(loginRes.status()).toBe(200);

    const storage = await request.storageState();
    await page.context().addCookies(storage.cookies);

    const slug = uniqueSlug("hh");
    const hhRes = await request.post("/api/households", {
      data: { name: "Theme Test Family", slug },
    });
    expect(hhRes.status()).toBe(201);

    const cpRes = await request.post("/api/child-profiles", {
      data: { householdId: (await hhRes.json()).household.id, displayName: "Theme Child", ageBand: "6-8" },
    });
    expect(cpRes.status()).toBe(201);

    await page.goto("/app/profiles");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Çocuk Profilleri" })).toBeVisible({ timeout: 15000 });
  });

  test("forgot-password page: Turkish copy", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Şifremi unuttum" })).toBeVisible();
  });

  test("reset-password page: Turkish copy", async ({ page }) => {
    await page.goto("/reset-password?token=dummy");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Parolayı yenile" })).toBeVisible();
  });

  test("profiles page: 'Profili Aç' CTA bg-primary text-on-primary", async ({ page }) => {
    const identity = createTestIdentity("profile-cta");
    const request = page.request;

    const registerRes = await request.post("/api/auth/register", {
      data: {
        displayName: "E2E Theme",
        email: identity.email,
        password: identity.password,
        confirmPassword: identity.password,
      },
    });
    expect(registerRes.status()).toBe(201);

    const loginRes = await request.post("/api/auth/login", {
      data: { email: identity.email, password: identity.password, rememberMe: true },
    });
    expect(loginRes.status()).toBe(200);

    const storage = await request.storageState();
    await page.context().addCookies(storage.cookies);

    const hhRes = await request.post("/api/households", {
      data: { name: "Theme Test Family", slug: uniqueSlug("hh") },
    });
    expect(hhRes.status()).toBe(201);
    const householdId = (await hhRes.json()).household.id;

    const cpRes = await request.post("/api/child-profiles", {
      data: { householdId, displayName: "Theme Child", ageBand: "6-8" },
    });
    expect(cpRes.status()).toBe(201);

    await page.goto("/app/profiles");
    await page.waitForLoadState("networkidle");

    const cta = page.getByRole("link", { name: "Profili Aç" });
    await expect(cta).toBeVisible({ timeout: 15000 });
    expect(await cta.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(PRIMARY_RGB);
    expect(await cta.evaluate((el) => getComputedStyle(el).color)).toBe(ON_PRIMARY_RGB);

    await cta.hover();
    await expect.poll(() => cta.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(76, 41, 207)");
  });

  test("character onboarding: AI archetype card theme states", async ({ page }) => {
    const identity = createTestIdentity("char-theme");
    const request = page.request;

    const registerRes = await request.post("/api/auth/register", {
      data: {
        displayName: "E2E Theme",
        email: identity.email,
        password: identity.password,
        confirmPassword: identity.password,
      },
    });
    expect(registerRes.status()).toBe(201);

    const loginRes = await request.post("/api/auth/login", {
      data: { email: identity.email, password: identity.password, rememberMe: true },
    });
    expect(loginRes.status()).toBe(200);

    const storage = await request.storageState();
    await page.context().addCookies(storage.cookies);

    const hhRes = await request.post("/api/households", {
      data: { name: "Theme Test Family", slug: uniqueSlug("hh") },
    });
    expect(hhRes.status()).toBe(201);
    const householdId = (await hhRes.json()).household.id;

    const cpRes = await request.post("/api/child-profiles", {
      data: { householdId, displayName: "Theme Child", ageBand: "6-8" },
    });
    expect(cpRes.status()).toBe(201);
    const profileId = (await cpRes.json()).profile.id;

    const settingsRes = await request.put("/api/settings/llm", {
      data: { action: "upsert-key", householdId, apiKey: "sk-or-v1-theme-test-key" },
    });
    expect(settingsRes.status()).toBe(200);

    await page.goto(`/app/character-onboarding?childProfileId=${profileId}`);
    await expect(page.getByRole("heading", { name: "Karakter Başlangıç Akışı" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Karakter arketipi seç" })).toBeVisible();

    const cards = page.getByTestId("archetype-card");
    await expect(cards).toHaveCount(5, { timeout: 20000 });
    const firstCard = cards.nth(0);
    const secondCard = cards.nth(1);

    expect(await firstCard.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");
    expect(await secondCard.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");

    await firstCard.click();
    const selectedBg = await firstCard.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(selectedBg).not.toBe("rgb(255, 255, 255)");
    expect(selectedBg).not.toBe(PRIMARY_RGB);
    expect(await secondCard.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");

    expect(await firstCard.locator("p").first().evaluate((el) => getComputedStyle(el).color)).toBe(ON_SURFACE_RGB);
    expect(await firstCard.locator("p").nth(1).evaluate((el) => getComputedStyle(el).color)).toBe("rgb(72, 69, 86)");
  });
});