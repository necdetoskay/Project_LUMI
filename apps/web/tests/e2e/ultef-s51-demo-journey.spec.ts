import { expect, test } from "@playwright/test";

const DEMO = {
  parentEmail: "demo@lumi.local",
  childProfileId: "51000000-0000-4000-8000-000000000002",
  characterId: "51000000-0000-4000-8000-000000000003",
  sessionId: "51000000-0000-4000-8000-000000000072",
};

test.describe("S51 LUMI Demo Universe playable browser journey", () => {
  test("PX-LUMI-S51-DEMO-BROWSER-004 opens Elif, Lina and the seeded Story Reader", async ({
    page,
  }) => {
    const password = process.env.LUMI_DEMO_PARENT_PASSWORD;
    if (!password) throw new Error("LUMI_DEMO_PARENT_PASSWORD_REQUIRED");

    await page.goto("/login");
    await page.getByLabel("E-posta adresi").fill(DEMO.parentEmail);
    await page.getByLabel("Şifre").fill(password);
    await page.getByRole("button", { name: /Dünyama dön/i }).click();

    await expect(page).toHaveURL(/\/app(?:\?|$)/);
    await expect(page.getByText("Elif", { exact: true }).first()).toBeVisible();

    await page.goto(
      `/app/profiles/${DEMO.childProfileId}/characters/${DEMO.characterId}`,
    );
    await expect(page.getByRole("heading", { name: "Lina" })).toBeVisible();
    await expect(
      page.getByText("Fısıldayan Orman", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Parlayan Pusula", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Meşe Yaprağı", { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole("link", { name: "Hikâyelere git" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/app/profiles/${DEMO.childProfileId}\\?tab=stories`),
    );
    await expect(
      page.getByText("Fısıldayan Ormandaki İlk Işık", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Ormandaki İlk Işık", { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole("link", { name: "Devam et" }).first().click();
    await expect(page).toHaveURL(`/app/stories/${DEMO.sessionId}`);
    await expect(
      page.getByText("Ormandaki İlk Işık", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Lina, Fısıldayan Orman'ın ince patikasında ilerlerken/),
    ).toBeVisible();
    await expect(
      page.getByText("Kayıp Işık İzini Bul", { exact: true }).first(),
    ).toBeVisible();
  });
});
