import type {
  AssetRecord,
  NewAssetRecord,
  NewAssetVariantRecord,
} from "../../schema/media";

export interface AssetRepository {
  findById(id: string): Promise<AssetRecord | null>;
  create(input: NewAssetRecord): Promise<AssetRecord>;
  addVariant(input: NewAssetVariantRecord): Promise<void>;
}
