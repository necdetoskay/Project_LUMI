import { describe, it, expect } from "vitest";

import {
  CONSENT_TYPES,
  assertConsentType,
  grantConsent,
  revokeConsent,
} from "../../src/domain/consent";
import { ValidationError } from "../../src/domain/errors";

describe("Consent domain", () => {
  it("exposes known consent types", () => {
    expect(CONSENT_TYPES).toEqual([
      "content_generation",
      "media_generation",
      "voice_recording",
      "data_processing",
    ]);
  });

  it("asserts a valid consent type", () => {
    expect(assertConsentType("content_generation")).toBe("content_generation");
  });

  it("rejects an unknown consent type", () => {
    expect(() => assertConsentType("surveillance")).toThrow(ValidationError);
  });

  it("grants consent in granted status without revokedAt", () => {
    const granted = grantConsent({
      id: "c1",
      householdId: "h1",
      childProfileId: "child-1",
      consentType: "media_generation",
      grantedAt: new Date("2026-01-01"),
      grantedBy: "parent-1",
    });

    expect(granted.status).toBe("granted");
    expect(granted.revokedAt).toBeNull();
  });

  it("revokes a granted consent with a timestamp", () => {
    const granted = grantConsent({
      id: "c1",
      householdId: "h1",
      childProfileId: null,
      consentType: "data_processing",
      grantedAt: new Date("2026-01-01"),
      grantedBy: "parent-1",
    });

    const revoked = revokeConsent(granted, new Date("2026-02-01"));
    expect(revoked.status).toBe("revoked");
    expect(revoked.revokedAt).toEqual(new Date("2026-02-01"));
  });

  it("rejects revoking an already revoked consent", () => {
    const granted = grantConsent({
      id: "c1",
      householdId: "h1",
      childProfileId: null,
      consentType: "content_generation",
      grantedAt: new Date("2026-01-01"),
      grantedBy: "parent-1",
    });
    const revoked = revokeConsent(granted, new Date("2026-02-01"));

    expect(() => revokeConsent(revoked, new Date("2026-03-01"))).toThrow(
      ValidationError,
    );
  });
});
