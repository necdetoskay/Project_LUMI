import { expect, test } from "@playwright/test";

test.describe("first story flow", () => {
  test("creates and completes an interactive story", async ({
    page,
  }) => {
    await page.goto("/stories/new");

    await page.getByRole("button", {
      name: /Etkileşimli Hikâye/,
    }).click();

    await page.getByLabel("Başlık fikri").fill(
      "Kayıp Işık Haritası",
    );

    await page.getByLabel("Tema veya özel istek").fill(
      "Arkadaşlık ve cesaret temalı olsun.",
    );

    await expect(
      page.getByText("Tahmini üretim maliyeti"),
    ).toBeVisible();

    await page.getByRole("button", {
      name: "Hikâyeyi oluştur",
    }).click();

    await expect(
      page.getByRole("heading", {
        name: "Hikâyeniz hazırlanıyor",
      }),
    ).toBeVisible();

    await page.getByRole("link", {
      name: "Hazır hikâyeyi aç",
    }).click();

    await expect(
      page.getByRole("heading", {
        name: "Kayıp Işık Haritası",
      }),
    ).toBeVisible();

    await page.getByRole("button", {
      name: /Yeşil Vadi yolunu seç/,
    }).click();

    await page.getByRole("button", {
      name: "Hikâyeyi tamamla",
    }).click();

    await page.getByRole("button", {
      name: "Devam et",
    }).click();

    await page.getByRole("button", {
      name: "Hikâyeyi kaydet",
    }).click();

    await expect(
      page.getByRole("heading", {
        name: "Macera geçmişi",
      }),
    ).toBeVisible();
  });
});
