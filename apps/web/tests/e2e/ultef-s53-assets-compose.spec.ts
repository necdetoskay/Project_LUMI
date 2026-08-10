import { expect, test } from "@playwright/test";

const DEMO = {
  parentEmail: "demo@lumi.local",
};

test.describe("S53 Asset Management production-like Compose journey", () => {
  test("opens the Lina asset library after real parent login", async ({ page }) => {
    const password = process.env.LUMI_DEMO_PARENT_PASSWORD;
    if (!password) throw new Error("LUMI_DEMO_PARENT_PASSWORD_REQUIRED");

    await page.goto("/login");
    await page.getByLabel("E-posta adresi").fill(DEMO.parentEmail);
    await page.getByLabel("Şifre").fill(password);
    await page.getByRole("button", { name: /Dünyama dön/i }).click();

    await expect(page).toHaveURL(/\/app(?:\?|$)/);

    await page.goto("/app/assets");
    await expect(
      page.getByRole("heading", { name: "Görsel Kütüphanesi" }),
    ).toBeVisible();
    await expect(page.getByText("Asset Management", { exact: true })).toBeVisible();
    await expect(page.getByText("Lina kütüphanesi", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Karakter")).toHaveValue(
      "51000000-0000-4000-8000-000000000003",
    );
    await expect(page.getByRole("button", { name: "1 görsel üret" })).toBeVisible();
  });
});
