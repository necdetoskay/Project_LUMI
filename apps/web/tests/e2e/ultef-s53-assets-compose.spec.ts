import { expect, type Page, test } from "@playwright/test";

const DEMO = {
  parentEmail: "demo@lumi.local",
};

async function loginDemoParent(page: Page) {
  const password = process.env.LUMI_DEMO_PARENT_PASSWORD;
  if (!password) throw new Error("LUMI_DEMO_PARENT_PASSWORD_REQUIRED");

  await page.goto("/login");
  await page.getByLabel("E-posta adresi").fill(DEMO.parentEmail);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: /Dünyama dön/i }).click();
  await expect(page).toHaveURL(/\/app(?:\?|$)/);
}

test.describe("S53 Asset Management production-like Compose journey", () => {
  test("opens the Lina asset library after real parent login", async ({
    page,
  }) => {
    await loginDemoParent(page);

    await page.goto("/app/assets");
    await expect(
      page.getByRole("heading", { name: "Görsel Kütüphanesi" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /Karakter/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Çanta/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Eşyalar/ })).toBeVisible();
    await expect(
      page.getByText("Lina kütüphanesi", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Karakter")).toHaveValue(
      "51000000-0000-4000-8000-000000000003",
    );
    await expect(
      page.getByRole("button", { name: "1 görsel üret" }),
    ).toBeVisible();
  });

  test("keeps the asset workspace usable on a phone viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginDemoParent(page);

    await page.goto("/app/assets");
    await expect(
      page.getByRole("heading", { name: "Görsel Kütüphanesi" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /Karakter/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "1 görsel üret" }))
      .toBeVisible();

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);

    await page.getByRole("tab", { name: /Çanta/ }).click();
    await expect(page.getByRole("button", { name: "Kapalı" })).toBeVisible();
    await page.getByRole("button", { name: "Açık" }).click();
    await expect(page.getByText("Açık çanta")).toBeVisible();

    await page.getByRole("tab", { name: /Eşyalar/ }).click();
    await expect(
      page.getByRole("button", { name: /eşyayı üret/i }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  });
});
