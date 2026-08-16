import { describe, expect, it } from "vitest";

import {
  ageBandForAgeYears,
  validateAgeYears,
} from "../../src/domain/validation";

describe("exact child age", () => {
  it.each([
    [3, "3-5"],
    [5, "3-5"],
    [6, "6-8"],
    [8, "6-8"],
    [9, "9-12"],
    [12, "9-12"],
    [13, "13+"],
    [17, "13+"],
  ] as const)("maps age %i to safety band %s", (age, expectedBand) => {
    expect(ageBandForAgeYears(age)).toBe(expectedBand);
  });

  it.each([2, 18, 6.5, Number.NaN])("rejects invalid age %s", (age) => {
    expect(() => validateAgeYears(age)).toThrow();
  });
});
