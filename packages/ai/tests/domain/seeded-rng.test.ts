import { describe, expect, it } from "vitest";

import {
  createSeededRng,
  nextCandidateSeed,
} from "../../src/domain/seeded-rng";

describe("createSeededRng", () => {
  it("produces deterministic sequences for the same seed", () => {
    const a = createSeededRng("seed:abc");
    const b = createSeededRng("seed:abc");
    const seqA = [a.nextFloat(), a.nextFloat(), a.nextFloat()];
    const seqB = [b.nextFloat(), b.nextFloat(), b.nextFloat()];
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createSeededRng("seed:one");
    const b = createSeededRng("seed:two");
    expect(a.nextFloat()).not.toEqual(b.nextFloat());
  });

  it("nextFloat stays within [0, 1)", () => {
    const rng = createSeededRng("seed:bounds");
    for (let index = 0; index < 500; index += 1) {
      const value = rng.nextFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("nextInt respects inclusive bounds", () => {
    const rng = createSeededRng("seed:int");
    for (let index = 0; index < 500; index += 1) {
      const value = rng.nextInt(2, 9);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(9);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("pick returns an element from the list", () => {
    const rng = createSeededRng("seed:pick");
    const items = ["a", "b", "c"];
    for (let index = 0; index < 100; index += 1) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it("pick throws on empty list", () => {
    const rng = createSeededRng("seed:empty");
    expect(() => rng.pick([])).toThrow("empty");
  });
});

describe("nextCandidateSeed", () => {
  it("derives candidate seeds per index", () => {
    expect(nextCandidateSeed("universe", 0)).toBe("universe:candidate:0");
    expect(nextCandidateSeed("universe", 2)).toBe("universe:candidate:2");
  });
});
