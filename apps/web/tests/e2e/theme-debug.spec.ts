import { test } from "@playwright/test";

test("simple ping", async ({ page }) => {
  await page.goto("/");
  const text = await page.locator("body").innerText();
  console.log("Home page loaded, text length:", text.length);
});
