import { expect, test } from "@playwright/test";

test.describe("parent onboarding", () => {
  test("completes the first application vertical slice", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", {
      name: "Kuruluma başla",
    }).click();

    await page.getByLabel("Aile adı").fill("Oskay Ailesi");
    await page.getByLabel("Kısa adres").fill("oskay-ailesi");
    await page.getByRole("button", {
      name: "Aileyi oluştur",
    }).click();

    await page.getByLabel("Adı").fill("Lina");
    await page.getByLabel("Doğum yılı").fill("2021");
    await page.getByRole("button", {
      name: "Profili oluştur",
    }).click();

    await page.getByRole("button", {
      name: "Dünyayı oluştur",
    }).click();

    await page.getByLabel("Karakter adı").fill("Lina");
    await page.getByRole("button", {
      name: "Karakteri oluştur",
    }).click();

    await expect(
      page.getByRole("heading", {
        name: "LUMI temel dünyanız oluşturuldu",
      }),
    ).toBeVisible();

    await page.getByRole("link", {
      name: "Envanteri görüntüle",
    }).click();

    await expect(
      page.getByText("Envanteriniz şu anda boş"),
    ).toBeVisible();
  });
});
