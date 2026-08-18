import { expect, test } from "@playwright/test";

test.use({ channel: "chrome", viewport: { width: 1672, height: 941 } });

test("captures the canonical Test Lab dashboard", async ({ page }) => {
  await page.goto("/app/settings/test-lab/visual-test", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("canonical-test-lab-dashboard")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Test Lab" })).toBeVisible();

  await page.screenshot({
    path: "test-results/test-lab-canonical-ui1.png",
    fullPage: false,
  });
});
