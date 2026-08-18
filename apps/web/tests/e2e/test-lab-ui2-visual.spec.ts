import { expect, test } from "@playwright/test";

test.use({ channel: "chrome", viewport: { width: 1672, height: 941 } });

test("captures canonical Test Lab UI2 with persisted-run-shaped data", async ({
  page,
}) => {
  await page.goto("/app/settings/test-lab/visual-test", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("canonical-test-lab-dashboard")).toBeVisible();
  await expect(page.getByLabel("Model")).toHaveValue(
    "openrouter/anthropic/claude-sonnet-4.5",
  );
  await expect(page.getByText("UI-3").first()).toBeVisible();

  await page.screenshot({
    path: "test-results/test-lab-ui2.png",
    fullPage: false,
  });
});
