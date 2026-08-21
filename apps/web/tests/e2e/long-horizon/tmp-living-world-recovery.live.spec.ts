import { expect, test } from "@playwright/test";

const childProfileId = process.env.LUMI_RECOVERY_CHILD_PROFILE_ID;
const expectedCharacterId = process.env.LUMI_RECOVERY_CHARACTER_ID;
const parentEmail = process.env.LUMI_LONG_HORIZON_PARENT_EMAIL;
const parentPassword = process.env.LUMI_LONG_HORIZON_PARENT_PASSWORD;

if (!childProfileId || !expectedCharacterId || !parentEmail || !parentPassword) {
  throw new Error(
    "Living World recovery proof requires profile id, character id and live parent credentials.",
  );
}

test("re-finalize existing character and recover Living World adventure candidates", async ({
  page,
}) => {
  await page.goto("/login");
  const loginForm = page.locator('form[action="/api/auth/login"]');
  await expect(loginForm).toBeVisible({ timeout: 60_000 });
  await loginForm.locator('input[name="email"]').fill(parentEmail);
  await loginForm.locator('input[name="password"]').fill(parentPassword);
  await Promise.all([
    page.waitForURL(/\/app(?:[/?#]|$)/, { timeout: 60_000 }),
    loginForm.locator('button[type="submit"]').click(),
  ]);

  const householdId = await page.evaluate(async () => {
    const response = await fetch("/api/onboarding");
    if (!response.ok) {
      throw new Error(`ONBOARDING_LOOKUP_FAILED:${response.status}`);
    }
    const body = (await response.json()) as {
      onboarding?: { householdId?: string | null };
    };
    return body.onboarding?.householdId ?? null;
  });
  expect(householdId, "authenticated household id must be available").toBeTruthy();

  const finalizeResult = await page.evaluate(
    async ({ householdId, childProfileId }) => {
      const response = await fetch("/api/character-creation/canonical", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "finalize",
          householdId,
          childProfileId,
        }),
      });
      return {
        status: response.status,
        text: await response.text(),
      };
    },
    { householdId: householdId!, childProfileId },
  );

  console.log(`RECOVERY_FINALIZE_STATUS=${finalizeResult.status}`);
  console.log(`RECOVERY_FINALIZE_BODY=${finalizeResult.text}`);
  expect(finalizeResult.status).toBe(200);

  const finalizeBody = JSON.parse(finalizeResult.text) as {
    characterId?: string;
    bootstrap?: { status?: string; idempotencyKey?: string };
  };
  expect(finalizeBody.characterId).toBe(expectedCharacterId);
  expect(finalizeBody.bootstrap?.status).toBe("pending");

  await expect
    .poll(
      async () =>
        page.evaluate(
          async ({ householdId, childProfileId }) => {
            const response = await fetch(
              `/api/child-profiles/${encodeURIComponent(childProfileId)}/stories?householdId=${encodeURIComponent(householdId)}`,
            );
            if (!response.ok) return -response.status;
            const body = (await response.json()) as {
              launchOptions?: Array<{ storySources?: unknown[] }>;
            };
            return (body.launchOptions ?? []).reduce(
              (total, option) => total + (option.storySources?.length ?? 0),
              0,
            );
          },
          { householdId: householdId!, childProfileId },
        ),
      {
        timeout: 90_000,
        intervals: [1_000, 2_000, 4_000, 5_000],
        message: "Living World bootstrap must materialize at least one story source",
      },
    )
    .toBeGreaterThan(0);

  await page.goto(
    `/app/profiles/${encodeURIComponent(childProfileId)}?section=stories`,
  );
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
      message: "Recovered New Adventure must expose visible candidate cards",
    })
    .toBeGreaterThan(0);
  await expect(cards.first()).toBeVisible();

  console.log(`RECOVERY_ADVENTURE_CANDIDATES=${await cards.count()}`);
});
