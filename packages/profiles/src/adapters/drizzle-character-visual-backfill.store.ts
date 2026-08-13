import { and, eq, or } from "drizzle-orm";

import type {
  CharacterVisualBackfillDerivativeInsert,
  CharacterVisualBackfillSource,
  CharacterVisualBackfillStorePort,
} from "../application/character-visual-backfill.service";
import type { CharacterVisualVariant } from "../application/character-visual-generation";
import { getProfileDb } from "../application/db";
import { characterVisualAssets } from "../db/schema/profile/character-visual-assets";

export class DrizzleCharacterVisualBackfillStore
  implements CharacterVisualBackfillStorePort
{
  async findReferenceSheetSources(input: {
    characterId?: string;
    householdId?: string;
    limit?: number;
  }): Promise<CharacterVisualBackfillSource[]> {
    const db = getProfileDb();

    const conditions = [
      eq(characterVisualAssets.assetKind, "character_reference_sheet"),
      ...(input.characterId
        ? [eq(characterVisualAssets.characterId, input.characterId)]
        : []),
      ...(input.householdId
        ? [eq(characterVisualAssets.householdId, input.householdId)]
        : []),
    ];

    const rows = await db
      .select()
      .from(characterVisualAssets)
      .where(and(...conditions))
      .limit(input.limit ?? 1000);

    return rows.map((row) => ({
      assetId: row.id,
      householdId: row.householdId,
      characterId: row.characterId,
      generationJobId: row.generationJobId,
      candidateIndex: row.candidateIndex,
      storageRef: row.storageRef,
      mimeType: row.mimeType,
      provider: row.provider,
      model: row.model,
      provenance: row.provenance,
    }));
  }

  async findExistingDerivatives(
    sourceAssetIds: string[],
  ): Promise<Record<string, CharacterVisualVariant[]>> {
    if (sourceAssetIds.length === 0) return {};

    const db = getProfileDb();
    const rows = await db
      .select({
        sourceCompositeAssetId: characterVisualAssets.sourceCompositeAssetId,
        assetKind: characterVisualAssets.assetKind,
      })
      .from(characterVisualAssets)
      .where(
        or(
          ...sourceAssetIds.map((id) =>
            eq(characterVisualAssets.sourceCompositeAssetId, id),
          ),
        ),
      );

    const grouped: Record<string, CharacterVisualVariant[]> = {};
    for (const row of rows) {
      if (!row.sourceCompositeAssetId) continue;
      const variant = row.assetKind as CharacterVisualVariant;
      grouped[row.sourceCompositeAssetId] ??= [];
      if (!grouped[row.sourceCompositeAssetId]!.includes(variant)) {
        grouped[row.sourceCompositeAssetId]!.push(variant);
      }
    }
    return grouped;
  }

  async insertDerivative(
    input: CharacterVisualBackfillDerivativeInsert,
  ): Promise<void> {
    const db = getProfileDb();
    await db.insert(characterVisualAssets).values({
      id: input.assetId,
      householdId: input.householdId,
      characterId: input.characterId,
      generationJobId: input.generationJobId,
      assetKind: input.assetKind,
      storageRef: input.storageRef,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      provider: input.provider,
      model: input.model,
      candidateIndex: input.candidateIndex,
      lifecycleState: "candidate",
      sourceCompositeAssetId: input.sourceCompositeAssetId,
      cropMetadata: input.cropMetadata,
      provenance: input.provenance,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
