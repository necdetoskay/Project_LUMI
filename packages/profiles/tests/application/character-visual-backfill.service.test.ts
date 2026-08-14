import { describe, expect, it } from "vitest";

import { CHARACTER_VISUAL_VARIANTS } from "../../src/application/character-visual-generation";
import {
  CharacterVisualBackfillService,
  type CharacterVisualBackfillDerivativeInsert,
  type CharacterVisualBackfillSource,
} from "../../src/application/character-visual-backfill.service";

function makeSource(
  overrides: Partial<CharacterVisualBackfillSource> = {},
): CharacterVisualBackfillSource {
  return {
    assetId: "src-1",
    householdId: "household-1",
    characterId: "character-1",
    generationJobId: "job-1",
    candidateIndex: 0,
    storageRef: "local-character-visual://sheet.png",
    mimeType: "image/png",
    provider: "openrouter",
    model: "krea/krea-2-medium-turbo",
    provenance: {
      briefVersion: "lumi-character-visual-v1",
      briefFingerprint: "fp-1",
    },
    ...overrides,
  };
}

function makeSplitter() {
  return {
    splitReferenceSheet: async () =>
      CHARACTER_VISUAL_VARIANTS.map((variant, index) => ({
        variant,
        bytesBase64: `bytes-${index}`,
        mimeType: "image/png",
        width: 100 + index,
        height: 200 + index,
        crop: { left: 0, top: 0, width: 0.25, height: 0.5 },
      })),
  };
}

describe("CharacterVisualBackfillService", () => {
  it("reports missing derivatives in dry-run mode without writing", async () => {
    const inserted: CharacterVisualBackfillDerivativeInsert[] = [];
    let reads = 0;
    const service = new CharacterVisualBackfillService({
      store: {
        findReferenceSheetSources: async () => [makeSource()],
        findExistingDerivatives: async () => ({ "src-1": ["head-front"] }),
        insertDerivative: async (row) => {
          inserted.push(row);
        },
      },
      storage: {
        read: async () => {
          reads += 1;
          return { bytes: Buffer.from("png"), mimeType: "image/png" };
        },
        store: async () => ({
          storageRef: "local-character-visual://part.png",
        }),
      },
      splitter: makeSplitter(),
    });

    const summary = await service.run({ mode: "dry-run" });

    expect(summary.mode).toBe("dry-run");
    expect(summary.scannedSources).toBe(1);
    expect(summary.missingDerivativeCount).toBe(6);
    expect(summary.createdDerivativeCount).toBe(0);
    expect(inserted).toHaveLength(0);
    expect(reads).toBe(0);
    expect(summary.details[0]?.missingVariants).toEqual(
      CHARACTER_VISUAL_VARIANTS.filter((variant) => variant !== "head-front"),
    );
  });

  it("skips sources that already have all seven variants", async () => {
    const service = new CharacterVisualBackfillService({
      store: {
        findReferenceSheetSources: async () => [makeSource()],
        findExistingDerivatives: async () => ({
          "src-1": [...CHARACTER_VISUAL_VARIANTS],
        }),
        insertDerivative: async () => {
          throw new Error("should not insert");
        },
      },
      storage: {
        read: async () => {
          throw new Error("should not read");
        },
        store: async () => {
          throw new Error("should not store");
        },
      },
      splitter: makeSplitter(),
    });

    const summary = await service.run({ mode: "apply" });

    expect(summary.missingDerivativeCount).toBe(0);
    expect(summary.createdDerivativeCount).toBe(0);
    expect(summary.sourcesWithAllDerivatives).toBe(1);
    expect(summary.details).toHaveLength(0);
  });

  it("applies missing derivatives and records provenance", async () => {
    const inserted: CharacterVisualBackfillDerivativeInsert[] = [];
    const service = new CharacterVisualBackfillService({
      store: {
        findReferenceSheetSources: async () => [makeSource()],
        findExistingDerivatives: async () => ({ "src-1": ["body-front"] }),
        insertDerivative: async (row) => {
          inserted.push(row);
        },
      },
      storage: {
        read: async () => ({
          bytes: Buffer.from("png"),
          mimeType: "image/png",
        }),
        store: async () => ({
          storageRef: "local-character-visual://part.png",
        }),
      },
      splitter: makeSplitter(),
    });

    const summary = await service.run({ mode: "apply" });

    expect(summary.createdDerivativeCount).toBe(6);
    expect(inserted).toHaveLength(6);
    const first = inserted[0]!;
    expect(first.sourceCompositeAssetId).toBe("src-1");
    expect(first.generationJobId).toBe("job-1");
    expect(first.provider).toBe("openrouter");
    expect(first.provenance).toMatchObject({
      derivation: "deterministic-seven-view-crop-v2",
      sourceCompositeAssetId: "src-1",
      briefVersion: "lumi-character-visual-v1",
      briefFingerprint: "fp-1",
    });
    expect(first.provenance.semanticRole).toBeDefined();
    expect(inserted.map((row) => row.assetKind)).toEqual(
      expect.arrayContaining(
        CHARACTER_VISUAL_VARIANTS.filter((variant) => variant !== "body-front"),
      ),
    );
  });

  it("runs without a generation job and omits absent provenance fields", async () => {
    const inserted: CharacterVisualBackfillDerivativeInsert[] = [];
    const service = new CharacterVisualBackfillService({
      store: {
        findReferenceSheetSources: async () => [
          makeSource({
            assetId: "src-2",
            generationJobId: null,
            provenance: {},
          }),
        ],
        findExistingDerivatives: async () => ({}),
        insertDerivative: async (row) => {
          inserted.push(row);
        },
      },
      storage: {
        read: async () => ({
          bytes: Buffer.from("png"),
          mimeType: "image/png",
        }),
        store: async () => ({
          storageRef: "local-character-visual://part.png",
        }),
      },
      splitter: makeSplitter(),
    });

    const summary = await service.run({ mode: "apply" });

    expect(summary.createdDerivativeCount).toBe(7);
    expect(inserted[0]?.generationJobId).toBeNull();
    expect(inserted[0]?.provenance.briefVersion).toBeUndefined();
    expect(inserted[0]?.provenance.briefFingerprint).toBeUndefined();
  });

  it("passes household and character filters to the store", async () => {
    const received: unknown[] = [];
    const service = new CharacterVisualBackfillService({
      store: {
        findReferenceSheetSources: async (input) => {
          received.push(input);
          return [makeSource()];
        },
        findExistingDerivatives: async () => ({}),
        insertDerivative: async () => {},
      },
      storage: {
        read: async () => ({
          bytes: Buffer.from("png"),
          mimeType: "image/png",
        }),
        store: async () => ({
          storageRef: "local-character-visual://part.png",
        }),
      },
      splitter: makeSplitter(),
    });

    await service.run({
      mode: "dry-run",
      characterId: "character-9",
      householdId: "household-9",
      limit: 5,
    });

    expect(received[0]).toEqual({
      characterId: "character-9",
      householdId: "household-9",
      limit: 5,
    });
  });
});
