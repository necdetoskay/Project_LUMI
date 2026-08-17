import { expect, test } from "@playwright/test";

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
  await loginForm.locator('button[type="submit"]').click();
  await expect(loginForm).not.toBeVisible({ timeout: 15_000 });

  await page.goto("/app/profiles");
  const profileLink = page.locator('a[href^="/app/profiles/"]').first();
  await expect(profileLink).toBeVisible({ timeout: 15_000 });
  const href = await profileLink.getAttribute("href");
  if (!href) throw new Error("Live profile link has no href");

  const profileUrl = new URL(href, page.url());
  profileUrl.searchParams.set("tab", "stories");
  await page.goto(profileUrl.toString());

  const stories = page.locator("#stories");
  await expect(stories).toBeVisible({ timeout: 20_000 });
  await expect(
    stories.getByRole("button", { name: /Yeni Macera|New Adventure/i }).first(),
  ).toBeVisible();
  await expect(stories.locator("text=/Macera|Adventure/i").first()).toBeVisible();

  const text = (await stories.innerText()).replace(/\s+/g, " ").trim();
  expect(text).not.toMatch(/\b(active|paused|reading|checkpoint|playbackMode)\b/i);
  expect(text).not.toMatch(/\bWorld\s+[0-9a-f]{4,}\b/i);

  console.log(`STORIES_SMOKE_URL=${page.url()}`);
  console.log(`STORIES_SMOKE_TEXT=${text.slice(0, 800)}`);
});
