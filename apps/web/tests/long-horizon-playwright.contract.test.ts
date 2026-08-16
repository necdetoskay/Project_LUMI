import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const LIVE_TEST_DIR = path.resolve(process.cwd(), "tests/e2e/long-horizon");

const FORBIDDEN_PATTERNS: Array<[RegExp, string]> = [
  [/\bcontext\.request\b/, "Playwright context.request"],
  [/\bpage\.request\b/, "Playwright page.request"],
  [/\bAPIRequestContext\b/, "Playwright APIRequestContext"],
  [/\brequest\.(?:get|post|put|patch|delete)\s*\(/, "direct request fixture"],
  [/\bpage\.route\s*\(/, "route interception"],
  [/\broute\.fulfill\s*\(/, "route fulfillment/mock"],
  [/\bfetch\s*\(\s*["'`]\/api\//, "direct API fetch"],
  [/@lumi\/[^"'`]+\/db\b/, "domain DB package import"],
  [/\b(?:drizzle-orm|postgres|pg)\b/, "database library import"],
  [
    /mock-(?:llm|openrouter)|mock\/canonical|MOCK_OPENROUTER/i,
    "mock provider/runtime",
  ],
  [
    /OPENROUTER_API_KEY|callStoryOpenRouter|callOpenRouter/,
    "direct provider access",
  ],
  [/route\.abort|route\.continue/, "network interception"],
];

async function liveSourceFiles(): Promise<
  Array<{ path: string; text: string }>
> {
  const names = await readdir(LIVE_TEST_DIR);
  const files = names.filter((name) => /\.(?:ts|tsx|mjs|js)$/.test(name));
  return Promise.all(
    files.map(async (name) => {
      const filePath = path.join(LIVE_TEST_DIR, name);
      return { path: filePath, text: await readFile(filePath, "utf8") };
    }),
  );
}

describe("live long-horizon Playwright execution contract", () => {
  it("contains no direct API, DB, provider, mock, or network interception shortcuts", async () => {
    const files = await liveSourceFiles();
    const violations: string[] = [];

    for (const file of files) {
      for (const [pattern, label] of FORBIDDEN_PATTERNS) {
        if (pattern.test(file.text)) {
          violations.push(`${path.basename(file.path)}: ${label}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("allows page.goto only for the initial visible login entry", async () => {
    const files = await liveSourceFiles();
    const gotoCalls: string[] = [];

    for (const file of files) {
      const matches = file.text.matchAll(/page\.goto\s*\(([^\n;]+)\)/g);
      for (const match of matches) {
        gotoCalls.push(`${path.basename(file.path)}:${match[1]?.trim() ?? ""}`);
      }
    }

    expect(gotoCalls).toEqual(['baseline-onboarding.live.spec.ts:"/login"']);
  });

  it("keeps the live pack free of cleanup/delete shortcuts", async () => {
    const files = await liveSourceFiles();
    const combined = files.map((file) => file.text).join("\n");

    expect(combined).not.toMatch(
      /archiveChild|deleteChild|cleanupLive|teardownLive/i,
    );
    expect(combined).not.toMatch(/\.delete\s*\(\s*["'`]\/api\//i);
  });
});
