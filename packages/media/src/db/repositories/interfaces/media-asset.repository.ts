import type {
  AssetGenerationMeta,
  AssetScope,
  AssetVariant,
  StoredAsset,
} from "../../../domain/asset";
import type { MediaAssetRepositoryPort } from "../../../ports/repository.port";

export type { MediaAssetRepositoryPort };
export type MediaAssetRow = StoredAsset;
export type MediaVariantRow = AssetVariant;
export type MediaGenerationRow = AssetGenerationMeta;
export type { AssetScope };
