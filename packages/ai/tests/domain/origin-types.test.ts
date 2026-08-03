import { describe, expect, it } from "vitest";

import {
  originBatchProposalSchema,
  originGenerationInputSchema,
  originPackageProposalSchema,
} from "../../src/domain/origin-types";
import {
  CanonViolationError,
  ContinuityViolationError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  RepairLimitReachedError,
  SafetyBlockedError,
  SchemaValidationError,
  generationErrorSchema,
} from "../../src/domain/generation-errors";
import { validationReportSchema } from "../../src/domain/validation-types";

describe("origin package schema", () => {
  it("accepts a valid proposal", () => {
    const proposal = {
      id: "origin:abc",
      characterKind: "animal",
      subtype: "cloud fox",
      originConcept: "A cloud fox who collects lost sounds.",
      startingRegionArchetype: "misty meadow",
      startingLocation: "the whispering willow",
      homeArchetype: "a hollow log den",
      nearbyNpcSeed: "sage owl",
      firstMysterySeed: "a glowing note in a hollow acorn",
      toneVector: ["wonder", "warmth"],
      noveltyMarkers: ["lost sounds", "hollow acorn messages"],
      universeSeed: "u:abc",
      candidateSeed: "u:abc:candidate:0",
      score: 4.2,
    };
    expect(originPackageProposalSchema.parse(proposal)).toEqual(proposal);
  });

  it("rejects an unknown character kind", () => {
    const proposal = {
      id: "origin:bad",
      characterKind: "dragon_ball",
      subtype: "x",
      originConcept: "y",
      startingRegionArchetype: "z",
      startingLocation: "w",
      homeArchetype: "v",
      nearbyNpcSeed: "u",
      firstMysterySeed: "t",
      toneVector: ["wonder"],
      noveltyMarkers: ["a"],
      universeSeed: "u",
      candidateSeed: "c",
      score: 3,
    };
    expect(originPackageProposalSchema.safeParse(proposal).success).toBe(false);
  });

  it("rejects empty tone vector", () => {
    const proposal = {
      id: "origin:no-tone",
      characterKind: "human",
      subtype: "x",
      originConcept: "y",
      startingRegionArchetype: "z",
      startingLocation: "w",
      homeArchetype: "v",
      nearbyNpcSeed: "u",
      firstMysterySeed: "t",
      toneVector: [],
      noveltyMarkers: ["a"],
      universeSeed: "u",
      candidateSeed: "c",
      score: 3,
    };
    expect(originPackageProposalSchema.safeParse(proposal).success).toBe(false);
  });
});

describe("origin batch schema", () => {
  it("accepts 1-5 packages", () => {
    const makeProposal = (id: string) => ({
      id,
      characterKind: "human",
      subtype: "x",
      originConcept: "y",
      startingRegionArchetype: "z",
      startingLocation: "w",
      homeArchetype: "v",
      nearbyNpcSeed: "u",
      firstMysterySeed: "t",
      toneVector: ["wonder"],
      noveltyMarkers: ["a"],
      universeSeed: "u",
      candidateSeed: `c:${id}`,
      score: 3,
    });
    expect(
      originBatchProposalSchema.safeParse({ packages: [makeProposal("a")] })
        .success,
    ).toBe(true);
    expect(
      originBatchProposalSchema.safeParse({
        packages: [1, 2, 3, 4, 5, 6].map((n) => makeProposal(String(n))),
      }).success,
    ).toBe(false);
  });
});

describe("origin generation input schema", () => {
  it("requires 3-5 candidates", () => {
    const base = {
      characterKind: "animal",
      childAgeBand: "6-8",
      universeSeed: "u",
      originSeed: "o",
      safetyBounds: [],
    };
    expect(
      originGenerationInputSchema.safeParse({ ...base, candidateCount: 3 })
        .success,
    ).toBe(true);
    expect(
      originGenerationInputSchema.safeParse({ ...base, candidateCount: 5 })
        .success,
    ).toBe(true);
    expect(
      originGenerationInputSchema.safeParse({ ...base, candidateCount: 2 })
        .success,
    ).toBe(false);
    expect(
      originGenerationInputSchema.safeParse({ ...base, candidateCount: 6 })
        .success,
    ).toBe(false);
  });
});

describe("typed errors", () => {
  it("carries a typed failure state", () => {
    const err = new ProviderUnavailableError("down");
    expect(err.failureState).toBe("provider_unavailable");
    expect(err).toBeInstanceOf(ProviderUnavailableError);
    expect(err).toBeInstanceOf(Error);

    const mapped = new Map<string, Error>([
      ["provider_unavailable", new ProviderUnavailableError()],
      ["provider_timeout", new ProviderTimeoutError()],
      ["schema_invalid", new SchemaValidationError()],
      ["safety_blocked", new SafetyBlockedError()],
      ["canon_violation", new CanonViolationError()],
      ["continuity_violation", new ContinuityViolationError()],
      ["repair_limit_reached", new RepairLimitReachedError()],
    ]);
    for (const [state, error] of mapped) {
      const cast = error as unknown as { failureState: string };
      expect(cast.failureState).toBe(state);
    }
  });

  it("serializes through the error schema", () => {
    const err = new SchemaValidationError("bad json");
    const parsed = generationErrorSchema.parse({
      name: err.name,
      message: err.message,
      failureState: err.failureState,
    });
    expect(parsed.failureState).toBe("schema_invalid");
  });
});

describe("validation report schema", () => {
  it("accepts a valid report", () => {
    const report = {
      valid: false,
      findings: [
        {
          kind: "safety",
          code: "SAFETY-001",
          message: "content too scary",
          severity: "error",
        },
      ],
    };
    expect(validationReportSchema.parse(report)).toEqual(report);
  });

  it("rejects unknown finding kinds", () => {
    const report = {
      valid: true,
      findings: [
        {
          kind: "spelling",
          code: "X",
          message: "nope",
          severity: "error",
        },
      ],
    };
    expect(validationReportSchema.safeParse(report).success).toBe(false);
  });
});
