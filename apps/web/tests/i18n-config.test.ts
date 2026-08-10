import { describe, expect, it } from "vitest";

import {
  defaultLocale,
  isUiLocale,
  resolveUiLocale,
  supportedLocales,
} from "../i18n/config";

describe("UI locale configuration", () => {
  it("supports Turkish and English with Turkish as the default", () => {
    expect(supportedLocales).toEqual(["tr", "en"]);
    expect(defaultLocale).toBe("tr");
  });

  it("accepts supported locale identifiers", () => {
    expect(isUiLocale("tr")).toBe(true);
    expect(isUiLocale("en")).toBe(true);
  });

  it("falls back deterministically for unsupported locale values", () => {
    expect(resolveUiLocale("de")).toBe("tr");
    expect(resolveUiLocale(undefined)).toBe("tr");
  });
});
