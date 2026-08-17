import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const LIVE_TEST_DIR = path.resolve(process.cwd(), "tests/e2e/long-horizon");
const EVIDENCE_README = path.join(LIVE_TEST_DIR, "evidence", "README.md");
const REQUIRED_EVIDENCE_FILES = [
  "00-run-summary.md",
  "01-child-profile.md",
  "02-character-foundation.md",
  "03-story-01.md",
  "04-story-02.md",
  "05-story-03.md",
  "06-story-04-item.md",
  "07-story-05-item.md",
  "08-story-06-rumor.md",
  "09-story-07-rumor.md",
  "10-final-world-state.md",
  "11-final-character-state.md",
  "12-final-inventory-bag.md",
  "13-final-npc-state.md",
  "14-final-relationships.md",
  "15-statistics.md",
  "run.json",
] as const;

const ALLOWED_VISIBLE_ENTRY_GOTOS = [
  'baseline-onboarding.live.spec.ts:"/login"',
  'login-smoke.live.spec.ts:"/login"',
  'stories-smoke.live.spec.ts:"/login"',
] as const;

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

  it("allows page.goto only for the explicit visible login entries", async () => {
    const files = await liveSourceFiles();
    const gotoCalls: string[] = [];

    for (const file of files) {
      const matches = file.text.matchAll(/page\.goto\s*\(([^\n;]+)\)/g);
      for (const match of matches) {
        gotoCalls.push(`${path.basename(file.path)}:${match[1]?.trim() ?? ""}`);
      }
    }

    expect(gotoCalls.sort()).toEqual([...ALLOWED_VISIBLE_ENTRY_GOTOS].sort());
  });

  it("keeps the live pack free of cleanup/delete shortcuts", async () => {
    const files = await liveSourceFiles();
    const combined = files.map((file) => file.text).join("\n");

    expect(combined).not.toMatch(
      /archiveChild|deleteChild|cleanupLive|teardownLive/i,
    );
    expect(combined).not.toMatch(/\.delete\s*\(\s*["'`]\/api\//i);
  });

  it("refuses to silently reuse an existing evidence run id", async () => {
    const support = await readFile(
      path.join(LIVE_TEST_DIR, "live-run-support.ts"),
      "utf8",
    );

    expect(support).toContain('flag: "wx"');
  });

  it("versions the complete evidence layout and cross-age comparison contract", async () => {
    const readme = await readFile(EVIDENCE_README, "utf8");

    expect(readme).toContain("Evidence format");
    expect(readme).toContain("ages 4, 5, 6, and 7");
    expect(readme).toContain("Do **not** compare generated story sentences");
    for (const filename of REQUIRED_EVIDENCE_FILES) {
      expect(readme).toContain(`\`${filename}\``);
    }
  });
});
