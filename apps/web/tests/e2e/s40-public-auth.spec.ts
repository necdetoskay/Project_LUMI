import { expect, test } from "@playwright/test";

const forbiddenGameLanguage =
  /\b(xp|level|quest|skill points?|görev puanı|seviye atla)\b/i;

async function expectNoGamificationLeak(pageText: string) {
  expect(pageText).not.toMatch(forbiddenGameLanguage);
}

test.describe("ULTEF S40 public/auth visual contract", () => {
  test("landing expresses living-story identity without dashboard framing", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Her dönüşte seni hatırlayan bir dünya.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Önce hikâye kalitesi",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Hatırlayan bir dünya",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Oyun değil, yaşayan anlatı",
        exact: true,
      }),
    ).toBeVisible();

    const text = await page.locator("body").innerText();
    expect(text).not.toContain("Gelişim Analizi");
    expect(text).not.toContain("veri analitiği");
    expect(text).not.toContain("Dashboard");
    await expectNoGamificationLeak(text);
  });

  test("login keeps auth contract but presents return-to-story composition", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { level: 1, name: "Hikâyeme dön" }),
    ).toBeVisible();
    await expect(page.getByText("Dünyana geri dön")).toBeVisible();

    const form = page.locator('form[action="/api/auth/login"]');
    await expect(form).toBeVisible();
    await expect(form.locator('input[name="email"]')).toHaveAttribute(
      "required",
      "",
    );
    await expect(form.locator('input[name="password"]')).toHaveAttribute(
      "type",
      "password",
    );
    await expectNoGamificationLeak(await page.locator("body").innerText());
  });

  test("registration is a distinct first-page composition and preserves fields", async ({
    page,
  }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Yeni bir evrenin kapısını aç",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Dünya çocuğunla birlikte büyüyecek"),
    ).toBeVisible();

    const form = page.locator('form[action="/api/auth/register"]');
    await expect(form.locator('input[name="displayName"]')).toBeVisible();
    await expect(form.locator('input[name="email"]')).toHaveAttribute(
      "type",
      "email",
    );
    await expect(form.locator('input[name="password"]')).toHaveAttribute(
      "minlength",
      "10",
    );
    await expect(form.locator('input[name="confirmPassword"]')).toBeVisible();
    await expectNoGamificationLeak(await page.locator("body").innerText());
  });

  test("password recovery has its own calm composition and keeps recovery contract", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await expect(
      page.getByRole("heading", { level: 1, name: "Şifremi unuttum" }),
    ).toBeVisible();
    await expect(
      page.getByText("Hikâyene giden yolu yeniden bul"),
    ).toBeVisible();

    const form = page.locator('form[action="/api/auth/forgot-password"]');
    await expect(form.locator('input[name="email"]')).toHaveAttribute(
      "type",
      "email",
    );
    await expectNoGamificationLeak(await page.locator("body").innerText());
  });

  test("public/auth layouts remain readable on a narrow mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const path of ["/", "/login", "/register", "/forgot-password"]) {
      await page.goto(path);
      await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
      await expect(page.locator("h1").first()).toBeVisible();
    }
  });
});
