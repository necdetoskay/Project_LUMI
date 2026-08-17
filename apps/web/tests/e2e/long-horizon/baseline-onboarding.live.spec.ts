import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  createSeededRandom,
  formatRunSummary,
  formatStoryMarkdown,
  initializeRunJson,
  loadLongHorizonRunConfig,
  normalizeEvidenceText,
  safePathname,
  sanitizeFailure,
  type LongHorizonRunEvidence,
  type RecordedSelection,
  type RecordedStoryEvidence,
  type RecordedStorySource,
  writeMarkdown,
  writeRunJson,
} from "./live-run-support";

const GENERATED_STEP_TIMEOUT_MS = 180_000;
const STORY_GENERATION_TIMEOUT_MS = 360_000;
const MAX_CANDIDATE_ROTATIONS = 8;
const STORY_MIN_CHARS = 1_500;
const STORY_MAX_CHARS = 2_000;

type EvidenceCheckpoint = (phase: string) => Promise<void>;

type VisibleAdventureCandidate = {
  sourceFamily: RecordedStorySource;
  sourceLabel: string;
  sourceTitle: string;
  sourceTeaser: string;
  key: string;
  card: Locator;
};

const SOURCE_LABELS: Record<RecordedStorySource, string> = {
  world_event: "Dünyada Bir Şey Oldu",
  npc_call: "Birinden Gelen Çağrı",
  inventory_item: "Çantandaki Bir Eşya",
  rumor: "Bir Söylenti Duydun",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
    testId?: string | undefined;
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
    page.waitForURL(/\/app(?:[/?#]|$)/, { timeout: 60_000 }),
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

async function openStoriesTab(page: Page): Promise<void> {
  const storiesTab = page.getByRole("button", { name: /Hikâyeler$/ });
  await expect(storiesTab).toBeVisible({ timeout: 60_000 });
  await storiesTab.click();
  await expect(page.getByRole("button", { name: "Yeni Macera", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
}

async function visibleCandidateFromCard(
  card: Locator,
  sourceFamily: RecordedStorySource,
): Promise<VisibleAdventureCandidate> {
  const sourceLabel = SOURCE_LABELS[sourceFamily];
  const sourceTitle = normalizeEvidenceText(
    await card.locator("h3").first().innerText(),
    300,
  );
  const sourceTeaser = normalizeEvidenceText(
    await card.locator("p").first().innerText(),
    800,
  );
  return {
    sourceFamily,
    sourceLabel,
    sourceTitle,
    sourceTeaser,
    key: `${sourceFamily}:${sourceTitle}:${sourceTeaser}`,
    card,
  };
}

async function chooseVisibleAdventureCandidate(
  page: Page,
  desiredFamilies: RecordedStorySource[],
  usedKeys: Set<string>,
  requireDistinct: boolean,
  random: () => number,
): Promise<VisibleAdventureCandidate> {
  const newAdventure = page.getByRole("button", { name: "Yeni Macera", exact: true }).first();
  await expect(newAdventure).toBeVisible({ timeout: 60_000 });
  await newAdventure.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 60_000 });

  for (let rotation = 0; rotation <= MAX_CANDIDATE_ROTATIONS; rotation += 1) {
    const cards = dialog.getByTestId("adventure-candidate");
    await expect
      .poll(async () => cards.count(), {
        timeout: 60_000,
        message: "New Adventure must expose visible candidate cards",
      })
      .toBeGreaterThan(0);

    const matches: VisibleAdventureCandidate[] = [];
    const count = await cards.count();
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      if (!(await card.isVisible())) continue;
      const text = await card.innerText();
      for (const family of desiredFamilies) {
        if (!text.includes(SOURCE_LABELS[family])) continue;
        const candidate = await visibleCandidateFromCard(card, family);
        if (!requireDistinct || !usedKeys.has(candidate.key)) {
          matches.push(candidate);
        }
        break;
      }
    }

    if (matches.length > 0) {
      return matches[Math.floor(random() * matches.length)]!;
    }

    if (rotation < MAX_CANDIDATE_ROTATIONS) {
      const refresh = dialog.getByRole("button", {
        name: "Başka maceralar göster",
      });
      await expect(refresh).toBeEnabled();
      await refresh.click();
      await expect(refresh).toBeEnabled({ timeout: 60_000 });
    }
  }

  const labels = desiredFamilies
    .map((family) => SOURCE_LABELS[family])
    .join(", ");
  throw new Error(
    `LONG_HORIZON_PREREQUISITE_FAILED: expected a visible ${labels} candidate after ${MAX_CANDIDATE_ROTATIONS + 1} UI candidate pages`,
  );
}

async function startAndCompleteStory(
  page: Page,
  input: {
    sequence: number;
    desiredFamilies: RecordedStorySource[];
    usedKeys: Set<string>;
    requireDistinct: boolean;
    random: () => number;
    checkpoint: EvidenceCheckpoint;
  },
): Promise<RecordedStoryEvidence> {
  await input.checkpoint(`story:${input.sequence}:selecting-source`);
  const candidate = await chooseVisibleAdventureCandidate(
    page,
    input.desiredFamilies,
    input.usedKeys,
    input.requireDistinct,
    input.random,
  );
  if (input.requireDistinct) input.usedKeys.add(candidate.key);

  const startedAt = Date.now();
  const cta = candidate.card.getByRole("button");
  await expect(cta).toBeEnabled();
  await cta.click();

  await expect(page).toHaveURL(/\/app\/stories\/[^/?#]+\/?$/, {
    timeout: STORY_GENERATION_TIMEOUT_MS,
  });
  await input.checkpoint(`story:${input.sequence}:reader-opened`);

  const narrativeLocator = page.getByTestId("story-narrative");
  await expect(narrativeLocator).toBeVisible({
    timeout: STORY_GENERATION_TIMEOUT_MS,
  });
  const narrative = (await narrativeLocator.innerText()).trim();
  const sceneTitle = normalizeEvidenceText(
    await page.getByTestId("story-scene-title").innerText(),
    300,
  );

  expect(
    narrative.length,
    `Story ${input.sequence} must be produced by the application in the ${STORY_MIN_CHARS}-${STORY_MAX_CHARS} character target`,
  ).toBeGreaterThanOrEqual(STORY_MIN_CHARS);
  expect(narrative.length).toBeLessThanOrEqual(STORY_MAX_CHARS);

  const visibleChoices = page.getByTestId("story-choice-option");
  expect(
    await visibleChoices.count(),
    "Long-horizon short-story generation should render one complete generated narrative, not a hidden multi-step fixture graph",
  ).toBe(0);

  const readerPath = safePathname(page.url());
  const generationDurationMs = Date.now() - startedAt;
  const complete = page.getByTestId("complete-story");
  await expect(complete).toBeVisible({ timeout: 60_000 });
  await complete.click();
  await expect(
    page.getByText("Hikâye tamamlandı.", { exact: true }),
  ).toBeVisible({
    timeout: 60_000,
  });

  const checkpointSummarySection = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", {
        name: "Oturum ozeti",
        exact: true,
      }),
    })
    .first();
  await expect(checkpointSummarySection).toBeVisible({ timeout: 60_000 });
  const checkpointSummary = normalizeEvidenceText(
    await checkpointSummarySection.innerText(),
    1_200,
  );

  await input.checkpoint(`story:${input.sequence}:completed`);
  await page.getByRole("link", { name: "Hikâyelere dön" }).click();
  await expect(page).toHaveURL(/\/app\/profiles\/[^/?#]+(?:\?tab=stories)?$/i, {
    timeout: 60_000,
  });
  await expect(page.getByRole("button", { name: "Yeni Macera", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });

  const persistedCard = page
    .locator(`a[href="${readerPath}"]`)
    .filter({ has: page.locator("h4") })
    .first();
  await expect(
    persistedCard,
    `Completed story ${input.sequence} must remain visible in the child profile story history`,
  ).toBeVisible({ timeout: 60_000 });
  const persistedTitle = normalizeEvidenceText(
    await persistedCard.locator("h4").innerText(),
    300,
  );
  const playerRecap = normalizeEvidenceText(
    await persistedCard.locator("p").first().innerText(),
    1_200,
  );

  const story: RecordedStoryEvidence = {
    sequence: input.sequence,
    sourceFamily: candidate.sourceFamily,
    sourceLabel: candidate.sourceLabel,
    sourceTitle: candidate.sourceTitle,
    sourceTeaser: candidate.sourceTeaser,
    sceneTitle,
    narrative,
    narrativeLength: narrative.length,
    durationMs: generationDurationMs,
    readerPath,
    persistedTitle,
    playerRecap: playerRecap || "empty recap rendered in current UI",
    checkpointSummary,
    relevantLocation:
      "not exposed as per-story metadata in the current generated reader/history UI",
    importantItemChanges:
      candidate.sourceFamily === "inventory_item"
        ? "inventory-item source is visible; per-story inventory delta is not exposed in the current reader/history UI"
        : "not exposed as per-story metadata in the current reader/history UI",
    npcsInvolved:
      "not exposed as structured per-story metadata in the current generated reader/history UI",
    observableChoicesOutcomes:
      "0 visible choice options; story completed through the visible Complete Story control",
    contextInspector:
      "Context Inspector / token / provider-cost metrics are not exposed in the current reader UI",
    persistedVerified: true,
  };

  await input.checkpoint(`story:${input.sequence}:persistence-verified`);
  return story;
}

function storyFilename(story: RecordedStoryEvidence): string {
  if (story.sequence <= 3) {
    return `0${story.sequence + 2}-story-0${story.sequence}.md`;
  }
  if (story.sourceFamily === "inventory_item") {
    return `0${story.sequence + 2}-story-0${story.sequence}-item.md`;
  }
  return `0${story.sequence + 2}-story-0${story.sequence}-rumor.md`;
}

function extractRelationshipValue(text: string): number | null {
  const match = text.match(/Yakınlık:\s*(-?\d+(?:\.\d+)?)/i);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

test.describe.serial("LUMI live long-horizon baseline", () => {
  test("UI-only child -> character -> 7 generated stories -> final living-world state", async ({
    page,
  }) => {
    const config = loadLongHorizonRunConfig();
    const random = createSeededRandom(config.rngSeed);
    const childDisplayName = `LUMI Test ${config.runId}`;
    const selections: RecordedSelection[] = [];
    const stories: RecordedStoryEvidence[] = [];
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
      stories,
    };

    let phase = evidence.phase;
    const checkpoint: EvidenceCheckpoint = async (nextPhase) => {
      phase = nextPhase;
      evidence.phase = nextPhase;
      evidence.lastPathname = safePathname(page.url());
      await writeRunJson(config, evidence);
    };

    await initializeRunJson(config, evidence);

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

      const profilesHomeLink = page
        .locator('a[href="/app/profiles"]')
        .filter({ hasText: "LUMI" })
        .first();
      await expect(profilesHomeLink).toBeVisible({ timeout: 60_000 });
      await profilesHomeLink.click({ timeout: 60_000 });
      await expect(page).toHaveURL(/\/app\/profiles(?:\?.*)?$/, {
        timeout: 60_000,
      });
      const createdProfileCard = page
        .locator("#profile-container article")
        .filter({ hasText: childDisplayName });
      await expect(createdProfileCard).toBeVisible({ timeout: 60_000 });
      await expect(createdProfileCard).toContainText(`${config.childAge} yaş`);
      await checkpoint("child-profile:verified");

      await createdProfileCard
        .getByRole("link", { name: "Profili aç" })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/app/profiles/${escapeRegExp(childProfileId)}/?$`),
        { timeout: 60_000 },
      );
      const createFirstCharacter = page
        .locator(
          `a[href="/app/profiles/${encodeURIComponent(childProfileId)}/characters/new/wizard"]`,
        )
        .first();
      await expect(createFirstCharacter).toBeVisible({ timeout: 60_000 });
      await createFirstCharacter.click({ timeout: 60_000 });
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
      await checkpoint("onboarding:character_identity:ready");
      await selectGeneratedCandidate(
        page,
        "character_identity",
        selections,
        random,
        checkpoint,
      );

      await expectStep(page, "universe");
      await checkpoint("onboarding:universe:ready");
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
        await checkpoint(`onboarding:${generatedStep}:ready`);
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
      await checkpoint("onboarding:committed");

      await page
        .getByLabel("Çocuk deneyimi")
        .getByRole("link", { name: "Profil", exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/app/profiles/${escapeRegExp(childProfileId)}/?$`),
        { timeout: 60_000 },
      );
      await openStoriesTab(page);

      const directKeys = new Set<string>();
      for (let sequence = 1; sequence <= 3; sequence += 1) {
        const story = await startAndCompleteStory(page, {
          sequence,
          desiredFamilies: ["world_event", "npc_call"],
          usedKeys: directKeys,
          requireDistinct: false,
          random,
          checkpoint,
        });
        stories.push(story);
        await writeMarkdown(
          config,
          storyFilename(story),
          formatStoryMarkdown(story),
        );
        await checkpoint(`story:${sequence}:evidence-saved`);
      }

      const itemKeys = new Set<string>();
      for (let sequence = 4; sequence <= 5; sequence += 1) {
        const story = await startAndCompleteStory(page, {
          sequence,
          desiredFamilies: ["inventory_item"],
          usedKeys: itemKeys,
          requireDistinct: true,
          random,
          checkpoint,
        });
        stories.push(story);
        await writeMarkdown(
          config,
          storyFilename(story),
          formatStoryMarkdown(story),
        );
        await checkpoint(`story:${sequence}:evidence-saved`);
      }

      const rumorKeys = new Set<string>();
      for (let sequence = 6; sequence <= 7; sequence += 1) {
        const story = await startAndCompleteStory(page, {
          sequence,
          desiredFamilies: ["rumor"],
          usedKeys: rumorKeys,
          requireDistinct: true,
          random,
          checkpoint,
        });
        stories.push(story);
        await writeMarkdown(
          config,
          storyFilename(story),
          formatStoryMarkdown(story),
        );
        await checkpoint(`story:${sequence}:evidence-saved`);
      }

      expect(stories).toHaveLength(7);
      expect(
        stories.filter((story) => story.sourceFamily === "inventory_item"),
      ).toHaveLength(2);
      expect(
        stories.filter((story) => story.sourceFamily === "rumor"),
      ).toHaveLength(2);

      await page.getByRole("button", { name: /Karakterler$/ }).click();
      const characterPanel = page.locator("main article").first();
      await expect(characterPanel).toBeVisible({ timeout: 60_000 });
      const finalCharacterState = (await characterPanel.innerText()).trim();
      evidence.finalCharacterState = finalCharacterState;
      await writeMarkdown(
        config,
        "11-final-character-state.md",
        `# Final Character State\n\n${finalCharacterState}`,
      );

      const worldLink = page.getByRole("link", {
        name: /Dünyasına Git|Dünyasını aç/,
      });
      await expect(worldLink).toBeVisible();
      await worldLink.click();
      await expect(page).toHaveURL(/\/world(?:\?.*)?$/, { timeout: 60_000 });
      const worldMain = page.locator("main").first();
      await expect(worldMain).toBeVisible({ timeout: 60_000 });
      const finalWorldState = (await worldMain.innerText()).trim();
      evidence.finalWorldState = finalWorldState;

      const worldStatus = normalizeEvidenceText(
        await page
          .getByText("Dunya durumu", { exact: true })
          .locator("xpath=following-sibling::p[1]")
          .innerText(),
        120,
      );
      const currentRegionBadge = page.getByText("Su an burada", {
        exact: true,
      });
      const currentRegion =
        (await currentRegionBadge.count()) > 0 &&
        (await currentRegionBadge.first().isVisible())
          ? normalizeEvidenceText(
              await currentRegionBadge
                .first()
                .locator("xpath=ancestor::article[1]")
                .getByRole("heading")
                .first()
                .innerText(),
              240,
            )
          : "not exposed in current world-map UI";
      const mapSummary = page
        .locator("section")
        .filter({
          has: page.getByRole("heading", {
            name: "Harita ozeti",
            exact: true,
          }),
        })
        .first();
      await expect(mapSummary).toBeVisible({ timeout: 60_000 });
      const currentLocation = normalizeEvidenceText(
        await mapSummary
          .getByText("Su anki konum", { exact: true })
          .locator("xpath=following-sibling::p[1]")
          .innerText(),
        240,
      );
      const inventorySummary = normalizeEvidenceText(
        await mapSummary
          .getByText("Canta", { exact: true })
          .locator("xpath=following-sibling::p[1]")
          .innerText(),
        120,
      );
      const homeBadge = page
        .locator("span")
        .filter({ hasText: /^Yuva$/ })
        .first();
      const homeLocation =
        (await homeBadge.count()) > 0 && (await homeBadge.isVisible())
          ? normalizeEvidenceText(
              await homeBadge
                .locator("xpath=ancestor::button[1]")
                .getByRole("heading")
                .first()
                .innerText(),
              240,
            )
          : "not separately exposed in current world-map UI";

      await writeMarkdown(
        config,
        "10-final-world-state.md",
        `# Final World State\n\n- World identity: not exposed as a stable id/name in the current world-map UI\n- World status: ${worldStatus}\n- Current region: ${currentRegion}\n- Current location: ${currentLocation}\n- Home location: ${homeLocation}\n- World events/opportunities: not exposed as a structured final-state list in the current world-map UI\n\n## Full visible world state\n\n${finalWorldState}`,
      );

      const inventoryHeading = page.getByRole("heading", { name: "Çanta" });
      await expect(inventoryHeading).toBeVisible({ timeout: 60_000 });
      const inventorySection = inventoryHeading.locator(
        "xpath=ancestor::section[1]",
      );
      const finalInventoryState = (await inventorySection.innerText()).trim();
      evidence.finalInventoryState = finalInventoryState;
      await writeMarkdown(
        config,
        "12-final-inventory-bag.md",
        `# Final Inventory / Bag\n\n${finalInventoryState}`,
      );

      const npcSummary = page.getByTestId("npc-relationship-summary");
      await expect(npcSummary).toBeVisible({ timeout: 60_000 });
      const npcCards = page.getByTestId("npc-state-card");
      const npcCount = await npcCards.count();
      const npcTexts: string[] = [];
      const relationshipValues: number[] = [];
      for (let index = 0; index < npcCount; index += 1) {
        const text = (await npcCards.nth(index).innerText()).trim();
        npcTexts.push(text);
        const value = extractRelationshipValue(text);
        if (value !== null) relationshipValues.push(value);
      }
      const finalNpcState =
        npcTexts.length > 0
          ? npcTexts.join("\n\n---\n\n")
          : (await npcSummary.innerText()).trim();
      evidence.finalNpcState = finalNpcState;
      evidence.finalRelationshipState = finalNpcState;
      await writeMarkdown(
        config,
        "13-final-npc-state.md",
        `# Final NPC State\n\n${finalNpcState}`,
      );
      await writeMarkdown(
        config,
        "14-final-relationships.md",
        `# Final Relationships\n\n${finalNpcState}`,
      );

      const totalNarrativeCharacters = stories.reduce(
        (sum, story) => sum + story.narrativeLength,
        0,
      );
      const strongest =
        relationshipValues.length > 0 ? Math.max(...relationshipValues) : null;
      const weakest =
        relationshipValues.length > 0 ? Math.min(...relationshipValues) : null;
      const sourceDistribution = {
        world_event: stories.filter(
          (story) => story.sourceFamily === "world_event",
        ).length,
        npc_call: stories.filter((story) => story.sourceFamily === "npc_call")
          .length,
        inventory_item: stories.filter(
          (story) => story.sourceFamily === "inventory_item",
        ).length,
        rumor: stories.filter((story) => story.sourceFamily === "rumor").length,
      };
      const persistedStoryCount = stories.filter(
        (story) => story.persistedVerified,
      ).length;
      const continuityFindings = [
        `${persistedStoryCount}/${stories.length} completed stories remained visible in the same child profile history`,
        `${stories.filter((story) => story.narrativeLength >= STORY_MIN_CHARS && story.narrativeLength <= STORY_MAX_CHARS).length}/${stories.length} rendered stories stayed inside the ${STORY_MIN_CHARS}-${STORY_MAX_CHARS} character contract`,
        "Final world, character, inventory and NPC/relationship views rendered through the same browser journey",
        "No deterministic generated-prose equality assertions were used",
      ];
      const generationRetryMetrics =
        "0 test-level story failures on a completed run; provider retry/failure counts are not exposed in the current UI";
      const contextTokenCostMetrics =
        "Context Inspector, token counts and provider-cost metrics are not exposed in the current UI";

      evidence.statistics = {
        childAge: config.childAge,
        characterId,
        worldIdentity:
          "not exposed as a stable id/name in the current world-map UI",
        worldStatus,
        currentRegion,
        currentLocation,
        homeLocation,
        totalStories: stories.length,
        sourceDistribution,
        totalRenderedStoryCharacters: totalNarrativeCharacters,
        storyLengths: stories.map((story) => story.narrativeLength),
        storyGenerationDurationsMs: stories.map((story) => story.durationMs),
        persistedStoryCount,
        inventorySummary,
        visibleNpcCount: npcCount,
        relationshipValues,
        strongestRelationship: strongest,
        weakestRelationship: weakest,
        generationRetryMetrics,
        contextTokenCostMetrics,
        continuityFindings,
      };

      await writeMarkdown(
        config,
        "15-statistics.md",
        `# Long-Horizon Statistics\n\n- Child age: ${config.childAge}\n- Character id: ${characterId}\n- World identity: ${evidence.statistics.worldIdentity}\n- World status: ${worldStatus}\n- Current region: ${currentRegion}\n- Current location: ${currentLocation}\n- Home location: ${homeLocation}\n- Total stories: ${stories.length}\n- World-event stories: ${sourceDistribution.world_event}\n- NPC-call stories: ${sourceDistribution.npc_call}\n- Inventory-item stories: ${sourceDistribution.inventory_item}\n- Rumor stories: ${sourceDistribution.rumor}\n- Persisted completed stories: ${persistedStoryCount}/${stories.length}\n- Total rendered story characters: ${totalNarrativeCharacters}\n- Story lengths: ${stories.map((story) => story.narrativeLength).join(", ")}\n- Story generation/start durations (ms): ${stories.map((story) => story.durationMs).join(", ")}\n- Final inventory summary: ${inventorySummary}\n- Visible NPC count: ${npcCount}\n- Relationship values: ${relationshipValues.length > 0 ? relationshipValues.join(", ") : "none visible"}\n- Strongest relationship: ${strongest ?? "not visible"}\n- Weakest relationship: ${weakest ?? "not visible"}\n- Failed/retried generations: ${generationRetryMetrics}\n- Context/token/cost metrics: ${contextTokenCostMetrics}\n- Persistent live data cleanup: disabled\n- Journey transport: visible browser UI only\n\n## Continuity findings\n\n${continuityFindings.map((finding) => `- ${finding}`).join("\n")}`,
      );

      evidence.status = "completed";
      await checkpoint("final-state:captured");
    } catch (caught) {
      evidence.status = "failed";
      evidence.failure = sanitizeFailure(caught, phase, config);
      throw caught;
    } finally {
      evidence.finishedAt = new Date().toISOString();
      evidence.lastPathname = safePathname(page.url());
      await writeRunJson(config, evidence);
      await writeMarkdown(
        config,
        "00-run-summary.md",
        formatRunSummary(evidence),
      );
    }
  });
});
