import { chromium } from "@playwright/test";

const DEFAULT_STORAGE_STATE_PATH =
  "/tmp/lumi-long-horizon-vercel-share-storage.json";

export default async function setupVercelShareSession(): Promise<void> {
  const baseURL = process.env.LUMI_LONG_HORIZON_BASE_URL;
  const shareSecret = process.env.LUMI_LONG_HORIZON_VERCEL_SHARE_SECRET;

  if (!shareSecret) return;
  if (!baseURL) {
    throw new Error(
      "LUMI_LONG_HORIZON_BASE_URL is required when a Vercel share bypass is configured.",
    );
  }

  const storageStatePath =
    process.env.LUMI_LONG_HORIZON_STORAGE_STATE_PATH ??
    DEFAULT_STORAGE_STATE_PATH;
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const origin = baseURL.replace(/\/$/, "");

    await page.goto(
      `${origin}/?_vercel_share=${encodeURIComponent(shareSecret)}`,
      { waitUntil: "domcontentloaded", timeout: 60_000 },
    );

    if (page.url().includes("/sso-api")) {
      throw new Error(
        "Vercel share bypass did not grant access to the protected Preview deployment.",
      );
    }

    await context.storageState({ path: storageStatePath });
  } finally {
    await browser.close();
  }
}
