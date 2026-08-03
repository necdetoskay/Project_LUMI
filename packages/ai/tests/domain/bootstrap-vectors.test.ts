import { describe, expect, it } from "vitest";

import {
  CHARACTER_KINDS,
  createBootstrapVectors,
  dominantVectorKeys,
  topVectorKeys,
} from "../../src/domain/bootstrap-vectors";

describe("createBootstrapVectors", () => {
  it("is deterministic for the same universe seed", () => {
    const input = {
      universeSeed: "u:alpha",
      characterKind: "animal" as const,
      childAgeBand: "6-8" as const,
    };
    const a = createBootstrapVectors(input);
    const b = createBootstrapVectors(input);
    expect(a).toEqual(b);
  });

  it("varies for different universe seeds", () => {
    const base = {
      characterKind: "animal" as const,
      childAgeBand: "6-8" as const,
    };
    const a = createBootstrapVectors({ ...base, universeSeed: "u:one" });
    const b = createBootstrapVectors({ ...base, universeSeed: "u:two" });
    expect(a.habitat).not.toEqual(b.habitat);
  });

  it("produces a complete vector set for every character kind", () => {
    for (const characterKind of CHARACTER_KINDS) {
      const vectors = createBootstrapVectors({
        universeSeed: "u:all",
        characterKind,
        childAgeBand: "6-8",
      });
      expect(Object.keys(vectors.habitat).length).toBeGreaterThan(0);
      expect(Object.keys(vectors.tone).length).toBeGreaterThan(0);
      expect(Object.keys(vectors.novelty).length).toBeGreaterThan(0);
      expect(Object.keys(vectors.mystery).length).toBeGreaterThan(0);
      expect(Object.keys(vectors.social).length).toBeGreaterThan(0);
      expect(Object.keys(vectors.risk).length).toBeGreaterThan(0);
      expect(Object.keys(vectors.magicTech).length).toBeGreaterThan(0);
    }
  });

  it("keeps all values within [0, 1]", () => {
    const vectors = createBootstrapVectors({
      universeSeed: "u:clamp",
      characterKind: "fantasy",
      childAgeBand: "9-12",
    });
    const all = Object.values(vectors).flatMap((v) => Object.values(v));
    for (const value of all) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("caps risk according to age band", () => {
    const young = createBootstrapVectors({
      universeSeed: "u:risk",
      characterKind: "human",
      childAgeBand: "3-5",
    });
    const older = createBootstrapVectors({
      universeSeed: "u:risk",
      characterKind: "human",
      childAgeBand: "9-12",
    });
    const maxYoung = Math.max(...Object.values(young.risk));
    const maxOlder = Math.max(...Object.values(older.risk));
    expect(maxYoung).toBeLessThanOrEqual(0.3);
    expect(maxOlder).toBeGreaterThan(maxYoung);
  });

  it("sea_creature keeps low dry-land habitat affinity", () => {
    const vectors = createBootstrapVectors({
      universeSeed: "u:sea",
      characterKind: "sea_creature",
      childAgeBand: "6-8",
    });
    expect(vectors.habitat.dryLand ?? 0).toBeLessThan(0.1);
    expect((vectors.habitat.water ?? 0) > (vectors.habitat.dryLand ?? 0)).toBe(
      true,
    );
  });
});

describe("topVectorKeys", () => {
  it("returns top N keys sorted by descending value", () => {
    const vector = { a: 0.2, b: 0.9, c: 0.5, d: 0.7 };
    expect(topVectorKeys(vector, 2)).toEqual(["b", "d"]);
  });

  it("never returns more than the vector size", () => {
    const vector = { a: 0.2, b: 0.9 };
    expect(topVectorKeys(vector, 5)).toHaveLength(2);
  });
});

describe("dominantVectorKeys", () => {
  it("returns dominant markers per dimension", () => {
    const vectors = createBootstrapVectors({
      universeSeed: "u:dom",
      characterKind: "robot",
      childAgeBand: "6-8",
    });
    const dominant = dominantVectorKeys(vectors);
    expect(dominant.habitat.length).toBeGreaterThanOrEqual(1);
    expect(dominant.tone.length).toBeGreaterThanOrEqual(1);
    expect(dominant.novelty.length).toBeGreaterThanOrEqual(1);
    expect(dominant.mystery.length).toBeGreaterThanOrEqual(1);
    expect(dominant.social.length).toBeGreaterThanOrEqual(1);
    expect(dominant.magicTech.length).toBeGreaterThanOrEqual(1);
  });
});
