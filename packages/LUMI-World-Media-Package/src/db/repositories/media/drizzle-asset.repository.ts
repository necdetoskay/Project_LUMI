import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../transaction";
import {
  assetVariants,
  assets,
  type AssetRecord,
  type NewAssetRecord,
  type NewAssetVariantRecord,
} from "../../schema/media";
import type { AssetRepository } from "./asset.repository";

export class DrizzleAssetRepository implements AssetRepository {
  constructor(
    private readonly executor: QueryExecutor,
  ) {}

  async findById(id: string): Promise<AssetRecord | null> {
    const [record] = await this.executor
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.id, id),
          isNull(assets.deletedAt),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  async create(input: NewAssetRecord): Promise<AssetRecord> {
    const [record] = await this.executor
      .insert(assets)
      .values(input)
      .returning();

    if (!record) {
      throw new Error("Asset creation returned no record");
    }

    return record;
  }

  async addVariant(input: NewAssetVariantRecord): Promise<void> {
    await this.executor
      .insert(assetVariants)
      .values(input);
  }
}
