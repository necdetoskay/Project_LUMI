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
  test("opens the Visual Library v2 after real parent login", async ({
    page,
  }) => {
    await loginDemoParent(page);

    await page.goto("/app/assets");
    await expect(
      page.getByRole("heading", { name: "Görsel Kütüphanesi" }),
    ).toBeVisible();
    await expect(
      page.getByText("Visual Library v2", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /Hikâyeler/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Karakterler/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Eşyalar/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Ortamlar/ })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Görsellerin ana merkezi artık hikâye",
      }),
    ).toBeVisible();

    await page.getByRole("tab", { name: /Eşyalar/ }).click();
    await expect(page.getByLabel("Karakter bağlamı")).toHaveValue(
      "51000000-0000-4000-8000-000000000003",
    );
    await expect(
      page.getByRole("heading", { name: "Eşyalar ve görsel durumları" }),
    ).toBeVisible();
    await expect(page.getByText("Lina çantası", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Çanta · state seti", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Kapalı", { exact: true })).toBeVisible();
    await expect(page.getByText("Açık", { exact: true })).toBeVisible();
  });

  test("keeps Visual Library v2 usable on a phone viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginDemoParent(page);

    await page.goto("/app/assets");
    await expect(
      page.getByRole("heading", { name: "Görsel Kütüphanesi" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /Hikâyeler/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Karakterler/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Eşyalar/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Ortamlar/ })).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);

    await page.getByRole("tab", { name: /Eşyalar/ }).click();
    await expect(page.getByText("Lina çantası", { exact: true })).toBeVisible();
    await expect(page.getByText("Kapalı", { exact: true })).toBeVisible();
    await expect(page.getByText("Açık", { exact: true })).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  });
});
