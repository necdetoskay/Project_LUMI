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

function findHouseholdId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findHouseholdId(item);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.householdId === "string") return record.householdId;
  if (
    record.household &&
    typeof record.household === "object" &&
    typeof (record.household as Record<string, unknown>).id === "string"
  ) {
    return (record.household as Record<string, unknown>).id as string;
  }
  for (const nested of Object.values(record)) {
    const found = findHouseholdId(nested);
    if (found) return found;
  }
  return null;
}

test("retry completed finalize and expose living-world adventure candidates", async ({
  page,
}) => {
  await login(page);

  const onboardingResponse = await page.request.get("/api/onboarding");
  const onboardingText = await onboardingResponse.text();
  expect(onboardingResponse.ok(), onboardingText).toBeTruthy();
  const onboarding = JSON.parse(onboardingText) as unknown;
  const householdId = findHouseholdId(onboarding);
  console.log(`BOOTSTRAP_RETRY_HOUSEHOLD_ID=${householdId ?? "missing"}`);
  expect(householdId, "Authenticated onboarding state must expose household scope").toBeTruthy();

  const finalizeResponse = await page.request.post(
    "/api/character-creation/canonical",
    {
      data: {
        action: "finalize",
        householdId,
        childProfileId,
      },
    },
  );
  const responseText = await finalizeResponse.text();
  console.log(`BOOTSTRAP_RETRY_FINALIZE_STATUS=${finalizeResponse.status()}`);
  console.log(`BOOTSTRAP_RETRY_FINALIZE_BODY=${responseText}`);
  expect(finalizeResponse.ok(), responseText).toBeTruthy();

  const payload = JSON.parse(responseText) as { characterId?: string };
  expect(payload.characterId).toBe(expectedCharacterId);

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
