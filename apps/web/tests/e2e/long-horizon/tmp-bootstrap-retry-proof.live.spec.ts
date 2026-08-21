import { expect, test } from "@playwright/test";

const childProfileId =
  process.env.LUMI_BOOTSTRAP_RETRY_CHILD_PROFILE_ID ??
  "6f41aea8-3eef-43c3-9db9-5ffa899b38fd";
const expectedCharacterId =
  process.env.LUMI_BOOTSTRAP_RETRY_CHARACTER_ID ??
  "b6ca9b09-aac7-4666-86d0-e9422041bc40";
const parentEmail = process.env.LUMI_LONG_HORIZON_PARENT_EMAIL;
const parentPassword = process.env.LUMI_LONG_HORIZON_PARENT_PASSWORD;

if (!parentEmail || !parentPassword) {
  throw new Error("Bootstrap retry proof requires live parent credentials.");
}

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  const form = page.locator('form[action="/api/auth/login"]');
  await expect(form).toBeVisible({ timeout: 60_000 });
  await form.locator('input[name="email"]').fill(parentEmail!);
  await form.locator('input[name="password"]').fill(parentPassword!);
  await Promise.all([
    page.waitForURL(/\/app(?:[/?#]|$)/, { timeout: 60_000 }),
    form.locator('button[type="submit"]').click(),
  ]);
}

test("retry completed finalize and expose living-world adventure candidates", async ({
  page,
}) => {
  await login(page);

  await page.goto(
    `/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/wizard`,
  );

  const finalize = page.getByTestId("finalize-character");
  await expect(finalize).toBeVisible({ timeout: 60_000 });

  const finalizeResponse = page.waitForResponse(
    (response) => {
      if (
        !response.url().endsWith("/api/character-creation/canonical") ||
        response.request().method() !== "POST"
      ) {
        return false;
      }
      try {
        return response.request().postDataJSON()?.action === "finalize";
      } catch {
        return false;
      }
    },
    { timeout: 60_000 },
  );

  await finalize.click();
  const response = await finalizeResponse;
  const responseText = await response.text();
  console.log(`BOOTSTRAP_RETRY_FINALIZE_STATUS=${response.status()}`);
  console.log(`BOOTSTRAP_RETRY_FINALIZE_BODY=${responseText}`);
  expect(response.ok(), responseText).toBeTruthy();

  const payload = JSON.parse(responseText) as { characterId?: string };
  expect(payload.characterId).toBe(expectedCharacterId);

  await expect(page).toHaveURL(
    new RegExp(`/app/profiles/${childProfileId}/characters/${expectedCharacterId}/?$`),
    { timeout: 60_000 },
  );

  await page.goto(`/app/profiles/${encodeURIComponent(childProfileId)}`);
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
  const candidates = dialog.getByTestId("adventure-candidate");
  await expect
    .poll(async () => candidates.count(), {
      timeout: 90_000,
      message:
        "Living World bootstrap retry must materialize at least one adventure candidate",
    })
    .toBeGreaterThan(0);

  const count = await candidates.count();
  console.log(`BOOTSTRAP_RETRY_CANDIDATE_COUNT=${count}`);
  console.log(
    `BOOTSTRAP_RETRY_FIRST_CANDIDATE=${(await candidates.first().innerText()).replace(/\s+/g, " ").slice(0, 800)}`,
  );
});
