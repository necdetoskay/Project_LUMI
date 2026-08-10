import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  const path = resolve(process.cwd(), "messages", `${locale}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

describe("translation catalogs", () => {
  it("keeps Turkish and English message keys in parity", () => {
    const turkishKeys = flattenKeys(readMessages("tr")).sort();
    const englishKeys = flattenKeys(readMessages("en")).sort();

    expect(englishKeys).toEqual(turkishKeys);
  });
});
