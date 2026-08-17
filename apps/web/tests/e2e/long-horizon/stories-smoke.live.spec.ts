import { expect, test } from "@playwright/test";

// Non-mutating production acceptance for the canonical Stories route.
test("production Stories route renders the child-first Adventure Hub", async ({
  page,
}) => {
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

  await Promise.all([
    page.waitForURL(/\/app(?:[/?#]|$)/, { timeout: 60_000 }),
    loginForm.locator('button[type="submit"]').click(),
  ]);

  const profileLink = page.locator('a[href^="/app/profiles/"]').first();
  await expect(profileLink).toBeVisible({ timeout: 60_000 });
  await profileLink.click();
  await expect(page).toHaveURL(/\/app\/profiles\/[^/?#]+(?:[/?#]|$)/, {
    timeout: 60_000,
  });

  const storiesTab = page.getByRole("button", {
    name: /Hikâyeler|Hikayeler|Stories/i,
  });
  await expect(storiesTab).toBeVisible({ timeout: 60_000 });
  await storiesTab.click();

  const newAdventure = page
    .getByRole("button", { name: /Yeni Macera|New Adventure/i })
    .first();
  await expect(newAdventure).toBeVisible({ timeout: 60_000 });

  const stories = page.locator("section").filter({ has: newAdventure }).first();
  await expect(stories).toBeVisible({ timeout: 60_000 });
  await expect(stories.locator("text=/Macera|Adventure/i").first()).toBeVisible();

  const text = (await stories.innerText()).replace(/\s+/g, " ").trim();
  expect(text).not.toMatch(
    /\b(active|paused|reading|checkpoint|playbackMode)\b/i,
  );
  expect(text).not.toMatch(/\bWorld\s+[0-9a-f]{4,}\b/i);

  console.log(`STORIES_SMOKE_URL=${page.url()}`);
  console.log(`STORIES_SMOKE_TEXT=${text.slice(0, 800)}`);
});
