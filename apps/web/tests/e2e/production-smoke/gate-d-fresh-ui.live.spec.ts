import { expect, test } from "@playwright/test";

const CHILD_PROFILE_ID = "167dbf4b-7944-4a1c-9d02-a291e24575b7";

test("fresh Gate D profile renders New Adventure candidates read-only", async ({ page }) => {
  const email = process.env.LUMI_LONG_HORIZON_PARENT_EMAIL;
  const password = process.env.LUMI_LONG_HORIZON_PARENT_PASSWORD;
  if (!email || !password) throw new Error("Missing live parent credentials");

  const login = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(login.ok()).toBe(true);

  await page.goto(`/app/profiles/${CHILD_PROFILE_ID}`);
  await expect(page).toHaveURL(new RegExp(`/app/profiles/${CHILD_PROFILE_ID}`));

  const storiesTab = page.getByRole("button", { name: "Hikâyeler", exact: true });
  if (await storiesTab.isVisible()) await storiesTab.click();

  const newAdventure = page.getByRole("button", { name: "Yeni Macera", exact: true }).first();
  await expect(newAdventure).toBeVisible({ timeout: 60_000 });
  await newAdventure.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 60_000 });
  const cards = dialog.getByTestId("adventure-candidate");
  await expect.poll(async () => cards.count(), { timeout: 60_000 }).toBeGreaterThan(0);

  const count = await cards.count();
  const texts: string[] = [];
  for (let index = 0; index < count; index += 1) {
    texts.push((await cards.nth(index).innerText()).replace(/\s+/g, " ").trim());
  }
  console.log(`LUMI_250_D_UI_CANDIDATE_COUNT=${count}`);
  console.log(`LUMI_250_D_UI_CANDIDATE_TEXTS=${JSON.stringify(texts)}`);
});
