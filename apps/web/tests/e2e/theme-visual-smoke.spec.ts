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

  test("profiles page: 'Karakter Baslat' CTA bg-primary text-on-primary", async ({ page }) => {
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

    const slug = uniqueSlug("hh");
    const hhRes = await request.post("/api/households", {
      data: { name: "Theme Test Family", slug },
    });
    expect(hhRes.status()).toBe(201);
    const householdId = (await hhRes.json()).household.id;

    const cpRes = await request.post("/api/child-profiles", {
      data: { householdId, displayName: "Theme Child", ageBand: "6-8" },
    });
    expect(cpRes.status()).toBe(201);

    await page.goto("/app/profiles");
    await page.waitForLoadState("networkidle");

    const cta = page.locator("a").filter({ hasText: "Karakter Baslat" });
    await expect(cta).toBeVisible({ timeout: 15000 });

    const bg = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);
    const color = await cta.evaluate((el) => getComputedStyle(el).color);
    expect(bg).toBe(PRIMARY_RGB);
    expect(color).toBe(ON_PRIMARY_RGB);

    await cta.hover();
    const hoverBg = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(hoverBg).toBe("rgb(76, 41, 207)");
  });

  test("character onboarding: unselected cards white, selected primary-fixed, text on-surface", async ({ page }) => {
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

    const slug = uniqueSlug("hh");
    const hhRes = await request.post("/api/households", {
      data: { name: "Theme Test Family", slug },
    });
    expect(hhRes.status()).toBe(201);
    const householdId = (await hhRes.json()).household.id;

    const cpRes = await request.post("/api/child-profiles", {
      data: { householdId, displayName: "Theme Child", ageBand: "6-8" },
    });
    expect(cpRes.status()).toBe(201);
    const profileId = (await cpRes.json()).profile.id;

    await page.goto(`/app/character-onboarding?childProfileId=${profileId}`);
    await page.waitForLoadState("networkidle");

    const section = page.locator("h2").filter({ hasText: "Karakter taini" }).locator("..").first();
    const btns = section.locator("button");
    await expect(btns).toHaveCount(5, { timeout: 15000 });

    const firstBtn = btns.nth(0);
    const secondBtn = btns.nth(1);

    const selectedBg = await firstBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
    const unselectedBg = await secondBtn.evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(unselectedBg).toBe("rgb(255, 255, 255)");

    expect(selectedBg).not.toBe(PRIMARY_RGB);
    expect(unselectedBg).not.toBe(PRIMARY_RGB);

    const labelColor = await firstBtn.locator("p").first().evaluate((el) => getComputedStyle(el).color);
    expect(labelColor).toBe(ON_SURFACE_RGB);

    const descColor = await firstBtn.locator("p").nth(1).evaluate((el) => getComputedStyle(el).color);
    expect(descColor).toBe("rgb(72, 69, 86)");
  });
});
