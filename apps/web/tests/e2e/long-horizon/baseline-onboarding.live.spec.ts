import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  createSeededRandom,
  loadLongHorizonRunConfig,
  type LongHorizonRunEvidence,
  type RecordedSelection,
  writeMarkdown,
  writeRunJson,
} from "./live-run-support";

const config = loadLongHorizonRunConfig();
const random = createSeededRandom(config.rngSeed);

async function clickRandomVisible(
  locator: Locator,
  step: string,
  selections: RecordedSelection[],
): Promise<void> {
  await expect(locator.first()).toBeVisible({ timeout: 120_000 });
  const count = await locator.count();
  const visible: { index: number; text: string }[] = [];
  for (let index = 0; index < count; index += 1) {
    const option = locator.nth(index);
    if (await option.isVisible()) {
      visible.push({
        index,
        text: (await option.innerText()).trim().replace(/\s+/g, " "),
      });
    }
  }
  expect(visible.length, `${step} must expose at least one visible option`).toBeGreaterThan(0);
  const chosen = visible[Math.floor(random() * visible.length)]!;
  selections.push({ step, index: chosen.index, visibleText: chosen.text });
  await locator.nth(chosen.index).click();
}

async function expectStep(page: Page, step: string): Promise<void> {
  await expect(page.getByTestId("canonical-onboarding-step")).toHaveAttribute(
    "data-step",
    step,
    { timeout: 120_000 },
  );
}

async function selectGeneratedCandidate(
  page: Page,
  step: string,
  selections: RecordedSelection[],
): Promise<void> {
  const cards = page.getByTestId("candidate-card");
  await clickRandomVisible(cards, step, selections);
  await expect(page.getByTestId("continue-step")).toBeEnabled();
  await page.getByTestId("continue-step").click();
}

async function loginThroughUi(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(config.parentEmail);
  await page.locator('input[name="password"]').fill(config.parentPassword);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 60_000 });
}

test.describe.serial("LUMI live long-horizon baseline", () => {
  test("creates an exact-age child and completes randomized canonical onboarding through visible UI", async ({
    page,
  }) => {
    const childDisplayName = `LUMI Test ${config.runId}`;
    const selections: RecordedSelection[] = [];
    const evidence: LongHorizonRunEvidence = {
      formatVersion: 1,
      runId: config.runId,
      childAge: config.childAge,
      rngSeed: config.rngSeed,
      startedAt: new Date().toISOString(),
      childDisplayName,
      selections,
    };

    await loginThroughUi(page);

    const newChildLink = page.getByRole("link", { name: /Yeni çocuk profili/i });
    await expect(newChildLink).toBeVisible();
    await newChildLink.click();

    await expect(page.getByRole("heading", { name: "Çocuk profilleri" })).toBeVisible();
    await page.getByLabel("Çocuğun adı").fill(childDisplayName);
    await page.getByLabel("Yaş").fill(String(config.childAge));
    await page.getByRole("button", { name: "Profil ekle" }).click();

    await expect(page).toHaveURL(/\/app\/profiles\/[0-9a-f-]+(?:\?.*)?$/, {
      timeout: 60_000,
    });
    await expect(page.getByText(childDisplayName, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(`${config.childAge} yaş`, { exact: false }).first()).toBeVisible();

    const firstCharacterLink = page.getByRole("link", {
      name: /İlk karakteri oluştur/i,
    });
    await expect(firstCharacterLink).toBeVisible();
    await firstCharacterLink.click();

    await expect(page).toHaveURL(/\/characters\/new\/wizard/);
    await expectStep(page, "character_type");
    await clickRandomVisible(
      page
        .getByTestId("canonical-onboarding-step")
        .locator('[data-testid^="choice-"]'),
      "character_type",
      selections,
    );
    await expect(page.getByTestId("continue-step")).toBeEnabled();
    await page.getByTestId("continue-step").click();

    await expectStep(page, "character_identity");
    await selectGeneratedCandidate(page, "character_identity", selections);

    await expectStep(page, "universe");
    await clickRandomVisible(
      page
        .getByTestId("canonical-onboarding-step")
        .locator('[data-testid^="choice-"]'),
      "universe",
      selections,
    );
    await expect(page.getByTestId("continue-step")).toBeEnabled();
    await page.getByTestId("continue-step").click();

    await expectStep(page, "world");
    await selectGeneratedCandidate(page, "world", selections);

    await expectStep(page, "compatibility");
    await selectGeneratedCandidate(page, "compatibility", selections);

    await expectStep(page, "region");
    await selectGeneratedCandidate(page, "region", selections);

    await expectStep(page, "origin");
    await selectGeneratedCandidate(page, "origin", selections);

    await expectStep(page, "core_saga");
    await selectGeneratedCandidate(page, "core_saga", selections);

    await expectStep(page, "final_review");
    const finalReview = (await page.getByTestId("final-review").innerText()).trim();
    expect(finalReview.length).toBeGreaterThan(40);
    evidence.finalReview = finalReview;

    await writeMarkdown(
      config,
      "01-child-profile.md",
      `# Child Profile\n\n- Run: ${config.runId}\n- Name: ${childDisplayName}\n- Exact age: ${config.childAge}\n- RNG seed: ${config.rngSeed}`,
    );
    await writeMarkdown(
      config,
      "02-character-foundation.md",
      `# Character Foundation\n\n## Random visible selections\n\n${selections
        .map((selection) => `- ${selection.step}: ${selection.visibleText}`)
        .join("\n")}\n\n## Final review\n\n${finalReview}`,
    );

    await page.getByTestId("finalize-character").click();
    await expect(page).toHaveURL(
      /\/app\/profiles\/[0-9a-f-]+\/characters\/[0-9a-f-]+$/,
      { timeout: 120_000 },
    );
    evidence.characterDetailUrl = page.url();
    await expect(page.getByRole("heading").first()).toBeVisible();

    await writeRunJson(config, evidence);
    await writeMarkdown(
      config,
      "00-run-summary.md",
      `# LUMI Long-Horizon Run ${config.runId}\n\n- Status: onboarding completed\n- Child age: ${config.childAge}\n- RNG seed: ${config.rngSeed}\n- Character URL: ${evidence.characterDetailUrl}\n- Persistent data cleanup: disabled by contract\n\nNext stage: three direct stories, then two inventory-item and two rumor stories.`,
    );
  });
});
