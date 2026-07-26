import { expect, test } from "@playwright/test";

test.describe("onboarding errors", () => {
  test("shows validation error for invalid household slug", async ({
    page,
  }) => {
    await page.goto("/onboarding/household");

    await page.getByLabel("Aile adı").fill("Oskay Ailesi");
    await page.getByLabel("Kısa adres").fill("Geçersiz Slug");

    await page.getByRole("button", {
      name: "Aileyi oluştur",
    }).click();

    await expect(
      page.getByText(
        "Sadece küçük harf, rakam ve tire kullanın.",
      ),
    ).toBeVisible();
  });
});
