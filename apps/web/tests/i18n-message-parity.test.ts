import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return flattenKeys(child, nextPrefix);
  });
}

function readMessages(locale: "tr" | "en") {
  const url = new URL(`../messages/${locale}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as unknown;
}

describe("translation catalogs", () => {
  it("keeps Turkish and English message keys in parity", () => {
    const turkishKeys = flattenKeys(readMessages("tr")).sort();
    const englishKeys = flattenKeys(readMessages("en")).sort();

    expect(englishKeys).toEqual(turkishKeys);
  });
});
