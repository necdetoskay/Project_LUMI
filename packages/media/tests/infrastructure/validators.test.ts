import { describe, expect, it } from "vitest";

import {
  StaticConsistencyValidator,
  StaticSafetyValidator,
} from "../../src/infrastructure/validators";
import { IDENTITY } from "../fixtures/media.fixtures";

describe("StaticSafetyValidator", () => {
  const validator = new StaticSafetyValidator();

  it("passes a clean prompt", () => {
    expect(validator.validatePrompt("a cheerful meadow with flowers")).toEqual(
      [],
    );
  });

  it("rejects forbidden terms in prompt", () => {
    const findings = validator.validatePrompt("a scene with violence");
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.code === "CHILD_SAFETY-001")).toBe(true);
  });

  it("rejects empty image payload", () => {
    const findings = validator.validateImage(new Uint8Array(0));
    expect(findings.some((f) => f.code === "CONTENT-001")).toBe(true);
  });

  it("passes valid image payload", () => {
    expect(
      validator.validateImage(new TextEncoder().encode("png-bytes")),
    ).toEqual([]);
  });

  it("rejects forbidden audio terms", () => {
    const findings = validator.validateAudio(
      new TextEncoder().encode("a scary sound"),
    );
    expect(findings.some((f) => f.code === "CHILD_SAFETY-002")).toBe(true);
  });
});

describe("StaticConsistencyValidator", () => {
  const validator = new StaticConsistencyValidator();

  it("passes image that embeds identity trait hashes", () => {
    const bytes = new TextEncoder().encode(
      `image:req:${IDENTITY.referenceKey}:${IDENTITY.traitHashes.join(":")}`,
    );
    expect(validator.validateImageAgainstIdentity(IDENTITY, bytes)).toEqual([]);
  });

  it("flags missing trait hashes", () => {
    const bytes = new TextEncoder().encode("image-without-traits");
    const findings = validator.validateImageAgainstIdentity(IDENTITY, bytes);
    expect(findings.some((f) => f.code === "CONSISTENCY-001")).toBe(true);
  });
});
