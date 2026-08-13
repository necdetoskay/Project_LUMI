import {
  CHARACTER_VISUAL_VARIANTS,
  type CharacterVisualDerivativePort,
  type CharacterVisualVariant,
} from "./character-visual-generation";
import { buildDerivativeProvenance } from "./character-visual-provenance";

export type CharacterVisualBackfillSource = {
  assetId: string;
  householdId: string;
  characterId: string;
  generationJobId: string | null;
  candidateIndex: number;
  storageRef: string;
  mimeType: string | null;
  provider: string | null;
  model: string | null;
  provenance: Record<string, unknown>;
};

export type CharacterVisualBackfillDerivativeInsert = {
  assetId: string;
  householdId: string;
  characterId: string;
  generationJobId: string | null;
  candidateIndex: number;
  storageRef: string;
  mimeType: string;
  width: number;
  height: number;
  provider: string | null;
  model: string | null;
  sourceCompositeAssetId: string;
  assetKind: CharacterVisualVariant;
  cropMetadata: Record<string, unknown>;
  provenance: Record<string, unknown>;
};

export interface CharacterVisualBackfillStorePort {
  findReferenceSheetSources(input: {
    characterId?: string;
    householdId?: string;
    limit?: number;
  }): Promise<CharacterVisualBackfillSource[]>;
  findExistingDerivatives(
    sourceAssetIds: string[],
  ): Promise<Record<string, CharacterVisualVariant[]>>;
  insertDerivative(
    input: CharacterVisualBackfillDerivativeInsert,
  ): Promise<void>;
}

export interface CharacterVisualBackfillStoragePort {
  read(storageRef: string): Promise<{ bytes: Buffer; mimeType: string }>;
  store(input: {
    householdId: string;
    characterId: string;
    jobId: string;
    candidateIndex: number;
    bytesBase64: string;
    mimeType: string;
    variantKey?: CharacterVisualVariant;
  }): Promise<{ storageRef: string }>;
}

export type CharacterVisualBackfillRunInput = {
  mode: "dry-run" | "apply";
  characterId?: string;
  householdId?: string;
  limit?: number;
};

export type CharacterVisualBackfillDetail = {
  sourceAssetId: string;
  characterId: string;
  missingVariants: CharacterVisualVariant[];
};

export type CharacterVisualBackfillSummary = {
  mode: "dry-run" | "apply";
  scannedSources: number;
  sourcesWithAllDerivatives: number;
  missingDerivativeCount: number;
  createdDerivativeCount: number;
  details: CharacterVisualBackfillDetail[];
};

export class CharacterVisualBackfillService {
  constructor(
    private readonly deps: {
      store: CharacterVisualBackfillStorePort;
      storage: CharacterVisualBackfillStoragePort;
      splitter: CharacterVisualDerivativePort;
    },
  ) {}

  async run(
    input: CharacterVisualBackfillRunInput,
  ): Promise<CharacterVisualBackfillSummary> {
    const sources = await this.deps.store.findReferenceSheetSources({
      ...(input.characterId ? { characterId: input.characterId } : {}),
      ...(input.householdId ? { householdId: input.householdId } : {}),
      ...(input.limit ? { limit: input.limit } : {}),
    });

    const existing = await this.deps.store.findExistingDerivatives(
      sources.map((source) => source.assetId),
    );

    const details: CharacterVisualBackfillDetail[] = [];
    let createdDerivativeCount = 0;

    for (const source of sources) {
      const existingVariants = existing[source.assetId] ?? [];
      const missingVariants = CHARACTER_VISUAL_VARIANTS.filter(
        (variant) => !existingVariants.includes(variant),
      );
      if (missingVariants.length === 0) continue;

      details.push({
        sourceAssetId: source.assetId,
        characterId: source.characterId,
        missingVariants,
      });

      if (input.mode !== "apply") continue;

      const read = await this.deps.storage.read(source.storageRef);
      const parts = await this.deps.splitter.splitReferenceSheet({
        bytesBase64: read.bytes.toString("base64"),
        mimeType: read.mimeType,
      });

      for (const part of parts) {
        if (!missingVariants.includes(part.variant)) continue;

        const stored = await this.deps.storage.store({
          householdId: source.householdId,
          characterId: source.characterId,
          jobId: source.generationJobId ?? "backfill",
          candidateIndex: source.candidateIndex,
          bytesBase64: part.bytesBase64,
          mimeType: part.mimeType,
          variantKey: part.variant,
        });

        await this.deps.store.insertDerivative({
          assetId: crypto.randomUUID(),
          householdId: source.householdId,
          characterId: source.characterId,
          generationJobId: source.generationJobId,
          candidateIndex: source.candidateIndex,
          storageRef: stored.storageRef,
          mimeType: part.mimeType,
          width: part.width,
          height: part.height,
          provider: source.provider,
          model: source.model,
          sourceCompositeAssetId: source.assetId,
          assetKind: part.variant,
          cropMetadata: part.crop,
          provenance: buildDerivativeProvenance({
            sourceCompositeAssetId: source.assetId,
            variant: part.variant,
            ...(typeof source.provenance.briefVersion === "string"
              ? { briefVersion: source.provenance.briefVersion }
              : {}),
            ...(typeof source.provenance.briefFingerprint === "string"
              ? { briefFingerprint: source.provenance.briefFingerprint }
              : {}),
          }),
        });

        createdDerivativeCount += 1;
      }
    }

    return {
      mode: input.mode,
      scannedSources: sources.length,
      sourcesWithAllDerivatives: sources.length - details.length,
      missingDerivativeCount: details.reduce(
        (sum, detail) => sum + detail.missingVariants.length,
        0,
      ),
      createdDerivativeCount,
      details,
    };
  }
}
