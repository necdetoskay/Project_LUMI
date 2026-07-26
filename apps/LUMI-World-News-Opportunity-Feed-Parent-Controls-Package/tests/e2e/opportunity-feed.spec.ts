import { expect, test } from "@playwright/test";

test.describe("world feed and opportunity flow", () => {
  test("opens and accepts an opportunity", async ({
    page,
  }) => {
    await page.goto("/feed");

    await expect(
      page.getByRole("heading", {
        name: "Haberler ve fırsatlar",
      }),
    ).toBeVisible();

    await page.getByRole("link", {
      name: "İncele",
    }).first().click();

    await expect(
      page.getByRole("heading", {
        name: "Yaşlı denizciden bir davet",
      }),
    ).toBeVisible();

    await page.getByRole("button", {
      name: "Macerayı kabul et",
    }).click();

    await expect(page).toHaveURL(
      /stories\/new/,
    );
  });

  test("filters unread feed items", async ({
    page,
  }) => {
    await page.goto("/feed");

    await page.getByRole("button", {
      name: "Okunmamış",
    }).click();

    await expect(
      page.getByText(
        "Yaşlı denizciden bir davet",
      ),
    ).toBeVisible();

    await expect(
      page.getByText(
        "Bulut Köyü'nde festival hazırlığı",
      ),
    ).not.toBeVisible();
  });
});
