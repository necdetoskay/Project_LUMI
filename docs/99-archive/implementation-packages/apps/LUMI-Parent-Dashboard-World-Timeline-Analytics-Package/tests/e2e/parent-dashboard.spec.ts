import { expect, test } from "@playwright/test";

test.describe("parent dashboard", () => {
  test("shows summary metrics and timeline", async ({
    page,
  }) => {
    await page.goto("/parent-dashboard");

    await expect(
      page.getByRole("heading", {
        name: "LUMI kontrol paneli",
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Toplam AI maliyeti"),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Dünya zaman çizelgesi",
      }),
    ).toBeVisible();
  });

  test("changes dashboard date range", async ({
    page,
  }) => {
    await page.goto("/parent-dashboard");

    await page.getByRole("button", {
      name: "7 gün",
    }).click();

    await expect(
      page.getByRole("button", {
        name: "7 gün",
      }),
    ).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
