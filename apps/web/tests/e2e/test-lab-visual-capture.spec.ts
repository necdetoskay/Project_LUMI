import { expect, test } from "@playwright/test";

const baseUrl = process.env.LUMI_TEST_LAB_CAPTURE_BASE_URL;
const email = process.env.LUMI_TEST_LAB_CAPTURE_EMAIL;
const password = process.env.LUMI_TEST_LAB_CAPTURE_PASSWORD;

test.use({ viewport: { width: 1672, height: 941 } });

test("capture live production Test Lab", async ({ page }) => {
  test.skip(!baseUrl || !email || !password, "Live capture credentials are required");

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("E-posta adresi").fill(email!);
  await page.getByLabel("Şifre").fill(password!);
  await page.getByRole("button", { name: "Dünyama dön" }).click();
  await page.waitForURL(/\/app(?:\?|$)/, { timeout: 30_000 });

  await page.goto(`${baseUrl}/app/settings/test-lab`, {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByRole("heading", { name: "LUMI Test Lab" }),
  ).toBeVisible();

  await page.screenshot({
    path: "test-results/test-lab-real-viewport.png",
    fullPage: false,
  });
  await page.screenshot({
    path: "test-results/test-lab-real-full.png",
    fullPage: true,
  });
});
