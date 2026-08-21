import { expect, test } from "@playwright/test";

const childProfileId = process.env.LUMI_RECOVERY_CHILD_PROFILE_ID;
const characterId = process.env.LUMI_RECOVERY_CHARACTER_ID;
const parentEmail = process.env.LUMI_LONG_HORIZON_PARENT_EMAIL;
const parentPassword = process.env.LUMI_LONG_HORIZON_PARENT_PASSWORD;

if (!childProfileId || !characterId || !parentEmail || !parentPassword) {
  throw new Error(
    "Living World recovery proof requires existing profile/character ids and live parent credentials.",
  );
}

test("existing age-6 character exposes New Adventure candidates after 0074", async ({ page }) => {
  await page.goto("/login");
  const loginForm = page.locator('form[action="/api/auth/login"]');
  await expect(loginForm).toBeVisible({ timeout: 60_000 });
  await loginForm.locator('input[name="email"]').fill(parentEmail);
  await loginForm.locator('input[name="password"]').fill(parentPassword);
  await Promise.all([
    page.waitForURL(/\/app(?:[/?#]|$)/, { timeout: 60_000 }),
    loginForm.locator('button[type="submit"]').click(),
  ]);

  await page.goto(
    `/app/profiles/${encodeURIComponent(childProfileId)}/characters/${encodeURIComponent(characterId)}`,
  );
  await expect(page).toHaveURL(
    new RegExp(`/app/profiles/${childProfileId}/characters/${characterId}/?$`),
    { timeout: 60_000 },
  );

  const storiesTab = page.getByRole("button", { name: /Hikâyeler$/ });
  await expect(storiesTab).toBeVisible({ timeout: 60_000 });
  await storiesTab.click();

  const newAdventure = page
    .getByRole("button", { name: "Yeni Macera", exact: true })
    .first();
  await expect(newAdventure).toBeVisible({ timeout: 60_000 });
  await newAdventure.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 60_000 });
  const cards = dialog.getByTestId("adventure-candidate");
  await expect
    .poll(async () => cards.count(), {
      timeout: 60_000,
      message: "Recovered Living World must expose at least one New Adventure candidate",
    })
    .toBeGreaterThan(0);

  const count = await cards.count();
  console.log(`LIVING_WORLD_RECOVERY_CANDIDATE_COUNT=${count}`);
  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    if (await card.isVisible()) {
      console.log(
        `LIVING_WORLD_RECOVERY_CANDIDATE_${index + 1}=${(await card.innerText()).replace(/\s+/g, " ").slice(0, 500)}`,
      );
    }
  }
});
