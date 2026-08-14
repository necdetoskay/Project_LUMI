import { describe, expect, it } from "vitest";

import { buildDerivativeProvenance } from "../../src/application/character-visual-provenance";

describe("character visual provenance", () => {
  it("builds derivative provenance with derivation, layout version and semantic role", () => {
    const provenance = buildDerivativeProvenance({
      sourceCompositeAssetId: "src-1",
      variant: "head-front",
      briefVersion: "lumi-character-visual-v1",
      briefFingerprint: "fp-1",
    });

    expect(provenance.derivation).toBe("deterministic-seven-view-crop-v2");
    expect(provenance.sheetLayoutVersion).toBe(
      "deterministic-seven-view-crop-v2",
    );
    expect(provenance.semanticRole).toBe("portrait_primary");
    expect(provenance.variant).toBe("head-front");
    expect(provenance.sourceCompositeAssetId).toBe("src-1");
    expect(provenance.briefVersion).toBe("lumi-character-visual-v1");
    expect(provenance.briefFingerprint).toBe("fp-1");
  });

  it("omits optional brief fields when not provided", () => {
    const provenance = buildDerivativeProvenance({
      sourceCompositeAssetId: "src-1",
      variant: "body-back",
    });

    expect(provenance.semanticRole).toBe("full_body_back");
    expect(provenance.briefVersion).toBeUndefined();
    expect(provenance.briefFingerprint).toBeUndefined();
  });
});
