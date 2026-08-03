import { describe, expect, it } from "vitest";

import {
  DEFAULT_AVOID,
  buildOriginCreativeBrief,
} from "../../src/domain/creative-brief";
import { createBootstrapVectors } from "../../src/domain/bootstrap-vectors";

describe("buildOriginCreativeBrief", () => {
  it("builds a brief with dominant vectors and safety bounds", () => {
    const vectors = createBootstrapVectors({
      universeSeed: "u:brief",
      characterKind: "fantasy",
      childAgeBand: "6-8",
    });
    const brief = buildOriginCreativeBrief({
      characterKind: "fantasy",
      universeSeed: "u:brief",
      candidateSeed: "u:brief:candidate:0",
      vectors,
      safetyBounds: ["No scarier than a mild bedtime story."],
    });

    expect(brief.characterKind).toBe("fantasy");
    expect(brief.universeSeed).toBe("u:brief");
    expect(brief.candidateSeed).toBe("u:brief:candidate:0");
    expect(brief.safetyBounds).toEqual([
      "No scarier than a mild bedtime story.",
    ]);
    expect(brief.avoid).toEqual(DEFAULT_AVOID);
    expect(brief.dominantVectors.habitat.length).toBe(3);
    expect(brief.dominantVectors.tone.length).toBe(3);
    expect(brief.dominantVectors.novelty.length).toBe(3);
  });

  it("includes optional characterType and subtype when provided", () => {
    const vectors = createBootstrapVectors({
      universeSeed: "u:opt",
      characterKind: "animal",
      childAgeBand: "3-5",
    });
    const brief = buildOriginCreativeBrief({
      characterKind: "animal",
      characterType: "guardian",
      subtype: "cloud fox",
      universeSeed: "u:opt",
      candidateSeed: "u:opt:candidate:1",
      vectors,
      safetyBounds: [],
    });
    expect(brief.characterType).toBe("guardian");
    expect(brief.subtype).toBe("cloud fox");
  });

  it("omits optional fields when undefined", () => {
    const vectors = createBootstrapVectors({
      universeSeed: "u:omit",
      characterKind: "human",
      childAgeBand: "9-12",
    });
    const brief = buildOriginCreativeBrief({
      characterKind: "human",
      universeSeed: "u:omit",
      candidateSeed: "u:omit:candidate:2",
      vectors,
      safetyBounds: [],
    });
    expect("characterType" in brief).toBe(false);
    expect("subtype" in brief).toBe(false);
  });
});
