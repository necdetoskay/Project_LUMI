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
  test("opens the character-first Visual Library and focused Character Visual Hub", async ({
    page,
  }) => {
    await loginDemoParent(page);

    await page.goto("/app/assets");
    await expect(
      page.getByRole("heading", { name: "Görsel Kütüphanesi" }),
    ).toBeVisible();
    await expect(
      page.getByText("Visual Library v3", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Görsel dünyasını yönetmek istediğin karakteri seç",
      }),
    ).toBeVisible();
    await expect(page.getByText("Lina", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Karakter → Hikâyeler → Hikâye Görselleri/),
    ).toBeVisible();

    await page.getByRole("link", { name: /Lina/ }).first().click();
    await expect(page).toHaveURL(/\/app\/assets\/characters\//);
    await expect(
      page.getByRole("heading", { name: "Lina", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Character Visual Hub", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Görsel kimlik" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Yeni aday üret" }),
    ).toBeVisible();
    await expect(
      page.getByText("Üretilmiş adaylar", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Görünüm varyantları", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Lina hikâyeleri" }),
    ).toBeVisible();
  });

  test("keeps the character visual manager usable on a phone viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginDemoParent(page);

    await page.goto("/app/assets");
    await expect(
      page.getByRole("heading", { name: "Görsel Kütüphanesi" }),
    ).toBeVisible();
    await expect(page.getByText("Lina", { exact: true })).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);

    await page.getByRole("link", { name: /Lina/ }).first().click();
    await expect(
      page.getByRole("heading", { name: "Lina", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Yeni aday üret" }),
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
