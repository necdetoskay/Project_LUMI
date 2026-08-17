import { expect, test } from "@playwright/test";

test("production parent credentials can establish a real UI session", async ({ page }) => {
  const email = process.env.LUMI_LONG_HORIZON_PARENT_EMAIL;
  const password = process.env.LUMI_LONG_HORIZON_PARENT_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing live parent credentials");
  }

  await page.goto("/login");
  const loginForm = page.locator('form[action="/api/auth/login"]');
  await expect(loginForm).toBeVisible();

  await loginForm.locator('input[name="email"]').fill(email);
  await loginForm.locator('input[name="password"]').fill(password);
  await loginForm.locator('button[type="submit"]').click();

  await page.waitForTimeout(5_000);

  const currentUrl = page.url();
  const formVisible = await loginForm.isVisible().catch(() => false);
  const visibleText = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
  const safeExcerpt = visibleText.slice(0, 800);

  console.log(`LOGIN_SMOKE_URL=${currentUrl}`);
  console.log(`LOGIN_SMOKE_FORM_VISIBLE=${formVisible}`);
  console.log(`LOGIN_SMOKE_PAGE_TEXT=${safeExcerpt}`);

  expect(
    formVisible,
    `Login form remained visible after submit. Current URL: ${currentUrl}. Page: ${safeExcerpt}`,
  ).toBe(false);
  expect(currentUrl).not.toMatch(/\/login(?:[/?#]|$)/);
});
