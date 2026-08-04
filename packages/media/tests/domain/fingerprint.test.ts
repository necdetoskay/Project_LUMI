import { describe, expect, it } from "vitest";
import { computeMediaFingerprint } from "../../src/domain/fingerprint";
import { SCOPE } from "../fixtures/media.fixtures";

describe("computeMediaFingerprint", () => {
  it("is deterministic for identical inputs", () => {
    const a = computeMediaFingerprint({
      kind: "image",
      assetType: "scene",
      scope: SCOPE,
      policyKey: "medium:standard",
      contentKey: "a cheerful meadow",
    });
    const b = computeMediaFingerprint({
      kind: "image",
      assetType: "scene",
      scope: SCOPE,
      policyKey: "medium:standard",
      contentKey: "a cheerful meadow",
    });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when content changes", () => {
    const a = computeMediaFingerprint({
      kind: "image",
      assetType: "scene",
      scope: SCOPE,
      policyKey: "medium:standard",
      contentKey: "a cheerful meadow",
    });
    const b = computeMediaFingerprint({
      kind: "image",
      assetType: "scene",
      scope: SCOPE,
      policyKey: "medium:standard",
      contentKey: "a stormy sea",
    });
    expect(a).not.toBe(b);
  });

  it("is isolated by household scope", () => {
    const a = computeMediaFingerprint({
      kind: "image",
      assetType: "scene",
      scope: SCOPE,
      policyKey: "medium:standard",
      contentKey: "meadow",
    });
    const b = computeMediaFingerprint({
      kind: "image",
      assetType: "scene",
      scope: { ...SCOPE, householdId: "other-household" },
      policyKey: "medium:standard",
      contentKey: "meadow",
    });
    expect(a).not.toBe(b);
  });

  it("changes with identity reference", () => {
    const withoutIdentity = computeMediaFingerprint({
      kind: "image",
      assetType: "character_portrait",
      scope: SCOPE,
      identity: "none",
      policyKey: "medium:standard",
      contentKey: "portrait",
    });
    const withIdentity = computeMediaFingerprint({
      kind: "image",
      assetType: "character_portrait",
      scope: SCOPE,
      identity: "char-1:ref-key-1:trait-a",
      policyKey: "medium:standard",
      contentKey: "portrait",
    });
    expect(withoutIdentity).not.toBe(withIdentity);
  });
});
