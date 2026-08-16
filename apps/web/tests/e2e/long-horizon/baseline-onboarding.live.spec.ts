import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  createSeededRandom,
  formatRunSummary,
  loadLongHorizonRunConfig,
  normalizeEvidenceText,
  safePathname,
  sanitizeFailure,
  type LongHorizonRunEvidence,
  type RecordedSelection,
  writeMarkdown,
  writeRunJson,
} from "./live-run-support";

const GENERATED_STEP_TIMEOUT_MS = 180_000;

type EvidenceCheckpoint = (phase: string) => Promise<void>;

async function optionLabel(option: Locator): Promise<string> {
  const heading = option.locator("h3").first();
  const value =
    (await heading.count()) > 0
      ? await heading.innerText()
      : await option.innerText();
  return normalizeEvidenceText(value, 240);
}

async function clickRandomVisible(
  locator: Locator,
  step: string,
  selections: RecordedSelection[],
  random: () => number,
): Promise<void> {
  await expect(locator.first()).toBeVisible({
    timeout: GENERATED_STEP_TIMEOUT_MS,
  });
  const count = await locator.count();
  const visible: Array<{
    index: number;
    label: string;
    testId?: string;
  }> = [];

  for (let index = 0; index < count; index += 1) {
    const option = locator.nth(index);
    if (await option.isVisible()) {
      visible.push({
        index,
        label: await optionLabel(option),
        testId: (await option.getAttribute("data-testid")) ?? undefined,
      });
    }
  }

  expect(
    visible.length,
    `${step} must expose at least one visible option`,
  ).toBeGreaterThan(0);

  const chosen = visible[Math.floor(random() * visible.length)]!;
  await locator.nth(chosen.index).click();
  selections.push({
    step,
    candidateCount: visible.length,
    selectedIndex: chosen.index,
    selectedLabel: chosen.label,
    selectedTestId: chosen.testId,
    availableLabels: visible.map((option) => option.label),
  });
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
  random: () => number,
  checkpoint: EvidenceCheckpoint,
): Promise<void> {
  const cards = page.getByTestId("candidate-card");
  const error = page.getByTestId("onboarding-error");

  await expect
    .poll(
      async () => {
        if ((await error.count()) > 0 && (await error.isVisible())) {
          return "error";
        }
        if ((await cards.count()) > 0 && (await cards.first().isVisible())) {
          return "ready";
        }
        return "waiting";
      },
      {
        timeout: GENERATED_STEP_TIMEOUT_MS,
        message: `${step} must produce visible candidates or a visible product error`,
      },
    )
    .not.toBe("waiting");

  if ((await error.count()) > 0 && (await error.isVisible())) {
    throw new Error(
      `Canonical onboarding ${step} generation failed: ${normalizeEvidenceText(await error.innerText(), 500)}`,
    );
  }

  await clickRandomVisible(cards, step, selections, random);
  await checkpoint(`onboarding:${step}:selected`);
  await expect(page.getByTestId("continue-step")).toBeEnabled();
  await page.getByTestId("continue-step").click();
}

async function loginThroughUi(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  const loginForm = page.locator('form[action="/api/auth/login"]');
  await expect(loginForm).toBeVisible();
  await loginForm.locator('input[name="email"]').fill(email);
  await loginForm.locator('input[name="password"]').fill(password);

  await Promise.all([
    page.waitForURL(/\/app(?:\/|$)/, { timeout: 60_000 }),
    loginForm.locator('button[type="submit"]').click(),
  ]);
}

function extractId(pathname: string, pattern: RegExp, label: string): string {
  const match = pathname.match(pattern);
  if (!match?.[1]) {
    throw new Error(`${label} could not be extracted from ${pathname}`);
  }
  return decodeURIComponent(match[1]);
}

test.describe.serial("LUMI live long-horizon baseline", () => {
  test("live login -> child creation -> randomized canonical onboarding -> evidence", async ({
    page,
  }) => {
    const config = loadLongHorizonRunConfig();
    const random = createSeededRandom(config.rngSeed);
    const childDisplayName = `LUMI Test ${config.runId}`;
    const selections: RecordedSelection[] = [];
    const evidence: LongHorizonRunEvidence = {
      formatVersion: 1,
      runId: config.runId,
      childAge: config.childAge,
      rngSeed: config.rngSeed,
      startedAt: new Date().toISOString(),
      status: "running",
      phase: "initializing",
      childDisplayName,
      selections,
    };

    let phase = evidence.phase;
    const checkpoint: EvidenceCheckpoint = async (nextPhase) => {
      phase = nextPhase;
      evidence.phase = nextPhase;
      evidence.lastPathname = safePathname(page.url());
      await writeRunJson(config, evidence);
    };

    await writeRunJson(config, evidence);

    try {
      await loginThroughUi(page, config.parentEmail, config.parentPassword);
      await checkpoint("login:completed");

      const newChildLink = page
        .locator('a[href="/app/onboarding?addProfile=1"]')
        .first();
      await expect(
        newChildLink,
        "The live parent account must already have a primary household before this persistent pack runs",
      ).toBeVisible({ timeout: 60_000 });
      await newChildLink.click();

      const childForm = page
        .locator("form")
        .filter({ has: page.locator("#childName") });
      await expect(childForm).toBeVisible({ timeout: 60_000 });
      await childForm.locator("#childName").fill(childDisplayName);
      await childForm.locator("#ageYears").fill(String(config.childAge));
      await childForm.locator('button[type="submit"]').click();

      await expect(page).toHaveURL(/\/app\/profiles\/[^/?#]+(?:\?.*)?$/, {
        timeout: 60_000,
      });
      const childProfileId = extractId(
        safePathname(page.url()),
        /\/app\/profiles\/([^/]+)\/?$/,
        "child profile id",
      );
      evidence.childProfileId = childProfileId;
      await checkpoint("child-profile:created");

      await writeMarkdown(
        config,
        "01-child-profile.md",
        `# Child Profile\n\n- Run: ${config.runId}\n- Name: ${childDisplayName}\n- Exact age: ${config.childAge}\n- Child profile id: ${childProfileId}\n- RNG seed: ${config.rngSeed}\n- Creation path: browser UI only`,
      );

      const profilesLink = page.locator('a[href="/app/profiles"]').first();
      await expect(profilesLink).toBeVisible();
      await profilesLink.click();
      await expect(page).toHaveURL(/\/app\/profiles(?:\?.*)?$/);
      const createdProfileCard = page
        .locator("#profile-container article")
        .filter({ hasText: childDisplayName });
      await expect(createdProfileCard).toBeVisible({ timeout: 60_000 });
      await expect(createdProfileCard).toContainText(`${config.childAge} yaş`);
      await checkpoint("child-profile:verified");

      await page.goto(
        `/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/wizard`,
      );
      await expect(page).toHaveURL(/\/characters\/new\/wizard(?:\?.*)?$/);
      await expectStep(page, "character_type");
      await checkpoint("onboarding:character_type:ready");

      await clickRandomVisible(
        page
          .getByTestId("canonical-onboarding-step")
          .locator('[data-testid^="choice-"]'),
        "character_type",
        selections,
        random,
      );
      await checkpoint("onboarding:character_type:selected");
      await expect(page.getByTestId("continue-step")).toBeEnabled();
      await page.getByTestId("continue-step").click();

      await expectStep(page, "character_identity");
      await selectGeneratedCandidate(
        page,
        "character_identity",
        selections,
        random,
        checkpoint,
      );

      await expectStep(page, "universe");
      await clickRandomVisible(
        page
          .getByTestId("canonical-onboarding-step")
          .locator('[data-testid^="choice-"]'),
        "universe",
        selections,
        random,
      );
      await checkpoint("onboarding:universe:selected");
      await expect(page.getByTestId("continue-step")).toBeEnabled();
      await page.getByTestId("continue-step").click();

      for (const generatedStep of [
        "world",
        "compatibility",
        "region",
        "origin",
        "core_saga",
      ] as const) {
        await expectStep(page, generatedStep);
        await selectGeneratedCandidate(
          page,
          generatedStep,
          selections,
          random,
          checkpoint,
        );
      }

      await expectStep(page, "final_review");
      const finalReview = (
        await page.getByTestId("final-review").innerText()
      ).trim();
      expect(finalReview.length).toBeGreaterThan(40);
      evidence.finalReview = finalReview;
      await checkpoint("onboarding:final_review");

      await writeMarkdown(
        config,
        "02-character-foundation.md",
        `# Character Foundation\n\n## Random visible selections\n\n${selections
          .map(
            (selection) =>
              `- ${selection.step}: ${selection.selectedLabel} (${selection.selectedIndex + 1}/${selection.candidateCount})${selection.selectedTestId ? ` [${selection.selectedTestId}]` : ""}`,
          )
          .join("\n")}\n\n## Final review\n\n${finalReview}`,
      );

      await page.getByTestId("finalize-character").click();
      await expect(page).toHaveURL(
        /\/app\/profiles\/[^/?#]+\/characters\/[^/?#]+\/?$/,
        { timeout: 120_000 },
      );
      const characterDetailPath = safePathname(page.url());
      const characterId = extractId(
        characterDetailPath,
        /\/characters\/([^/]+)\/?$/,
        "character id",
      );
      evidence.characterId = characterId;
      evidence.characterDetailPath = characterDetailPath;
      await expect(page.getByRole("heading").first()).toBeVisible();

      evidence.status = "completed";
      await checkpoint("onboarding:committed");
    } catch (caught) {
      evidence.status = "failed";
      evidence.failure = sanitizeFailure(caught, phase, config);
      throw caught;
    } finally {
      evidence.finishedAt = new Date().toISOString();
      evidence.lastPathname = safePathname(page.url());
      await writeRunJson(config, evidence);
      await writeMarkdown(config, "00-run-summary.md", formatRunSummary(evidence));
    }
  });
});
