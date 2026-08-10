import { expect, test } from "@playwright/test";

const DEMO = {
  parentEmail: "demo@lumi.local",
  childProfileId: "51000000-0000-4000-8000-000000000002",
  characterId: "51000000-0000-4000-8000-000000000003",
  sessionId: "51000000-0000-4000-8000-000000000072",
};

test.describe("S52 LUMI playable persistent demo journey", () => {
  test("PX-LUMI-S52-PLAY-RELOAD-001 choice mutates world and survives reload", async ({
    page,
  }) => {
    const password = process.env.LUMI_DEMO_PARENT_PASSWORD;
    if (!password) throw new Error("LUMI_DEMO_PARENT_PASSWORD_REQUIRED");

    await page.goto("/login");
    await page.getByLabel("E-posta adresi").fill(DEMO.parentEmail);
    await page.getByLabel("Şifre").fill(password);
    await page.getByRole("button", { name: /Dünyama dön/i }).click();
    await expect(page).toHaveURL(/\/app(?:\?|$)/);

    await page.goto(`/app/stories/${DEMO.sessionId}`);
    await expect(
      page.getByText("Ormandaki İlk Işık", { exact: true }).first(),
    ).toBeVisible();

    await page
      .getByRole("button", {
        name: "Parlayan Pusula ile ışığın peşinden git",
      })
      .click();

    await expect(
      page.getByText("Ateşböceklerinin İzinde", { exact: true }).first(),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByText("Ateşböceklerinin İzinde", { exact: true }).first(),
    ).toBeVisible();

    await page.goto(
      `/app/profiles/${DEMO.childProfileId}/characters/${DEMO.characterId}`,
    );
    await expect(page.getByRole("heading", { name: "Lina" })).toBeVisible();
    await expect(
      page.getByText("Ateşböcekleri Korusu", { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole("link", { name: "Hikâyelere git" }).click();
    await page.getByRole("link", { name: "Devam et" }).first().click();
    await expect(page).toHaveURL(`/app/stories/${DEMO.sessionId}`);
    await expect(
      page.getByText("Ateşböceklerinin İzinde", { exact: true }).first(),
    ).toBeVisible();
  });
});
