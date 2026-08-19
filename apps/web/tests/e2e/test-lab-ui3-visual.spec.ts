import { expect, test } from "@playwright/test";

test.use({ channel: "chrome", viewport: { width: 1672, height: 941 } });

test("captures canonical Test Lab UI3 with evaluation-shaped data", async ({
  page,
}) => {
  await page.goto("/app/settings/test-lab/visual-test", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("canonical-test-lab-dashboard")).toBeVisible();
  await expect(page.getByText("82", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("4 / 5 değerlendirildi")).toBeVisible();
  await expect(page.getByText("Bütünlük", { exact: true })).toBeVisible();
  await expect(page.getByText("Story Quality v1 · blind judge")).toBeVisible();

  await page.screenshot({
    path: "test-results/test-lab-ui3.png",
    fullPage: false,
  });
});
