import { and, desc, eq } from "drizzle-orm";

import type { StoryVisualAssetSet } from "../../../domain/story-visual-manifest";
import type {
  PersistedStoryVisualAssetSet,
  PersistedStoryVisualManifest,
  PersistedStoryVisualRender,
  StoryVisualWorkspaceRepositoryPort,
} from "../../../ports/repository.port";
import type { QueryExecutor } from "../../client";
import {
  storyVisualAssetSetRenders,
  storyVisualAssetSets,
  storyVisualManifests,
} from "../../schema/media";

export class DrizzleStoryVisualWorkspaceRepository
  implements StoryVisualWorkspaceRepositoryPort
{
  constructor(private readonly db: QueryExecutor) {}

  async createManifest(
    input: Parameters<StoryVisualWorkspaceRepositoryPort["createManifest"]>[0],
  ): Promise<PersistedStoryVisualManifest> {
    const [row] = await this.db
      .insert(storyVisualManifests)
      .values({
        id: input.id,
        householdId: input.scope.householdId,
        childProfileId: input.scope.childProfileId,
        worldId: input.scope.worldId,
        storyId: input.manifest.storyId,
        schemaVersion: input.manifest.schemaVersion,
        source: input.manifest.source,
        manifestFingerprint: input.manifestFingerprint,
        manifestJson: input.manifest,
      })
      .returning();

    return toManifest(row!);
  }

  async getLatestManifest(
    storyId: string,
    scope: Parameters<
      StoryVisualWorkspaceRepositoryPort["getLatestManifest"]
    >[1],
  ): Promise<PersistedStoryVisualManifest | null> {
    const [row] = await this.db
      .select()
      .from(storyVisualManifests)
      .where(
        and(
          eq(storyVisualManifests.householdId, scope.householdId),
          eq(storyVisualManifests.childProfileId, scope.childProfileId),
          eq(storyVisualManifests.worldId, scope.worldId),
          eq(storyVisualManifests.storyId, storyId),
        ),
      )
      .orderBy(desc(storyVisualManifests.createdAt))
      .limit(1);

    return row ? toManifest(row) : null;
  }

  async createAssetSet(
    input: Parameters<StoryVisualWorkspaceRepositoryPort["createAssetSet"]>[0],
  ): Promise<PersistedStoryVisualAssetSet> {
    const [row] = await this.db
      .insert(storyVisualAssetSets)
      .values({
        id: input.assetSet.id,
        manifestId: input.manifestId,
        householdId: input.scope.householdId,
        childProfileId: input.scope.childProfileId,
        worldId: input.scope.worldId,
        storyId: input.assetSet.storyId,
        manifestFingerprint: input.assetSet.manifestFingerprint,
        styleId: input.assetSet.styleId,
        styleVersion: input.assetSet.styleVersion,
        status: input.assetSet.status,
        active: input.assetSet.active,
        createdAt: new Date(input.assetSet.createdAt),
      })
      .returning();

    return toAssetSet(row!);
  }

  async getActiveAssetSet(
    storyId: string,
    scope: Parameters<
      StoryVisualWorkspaceRepositoryPort["getActiveAssetSet"]
    >[1],
  ): Promise<PersistedStoryVisualAssetSet | null> {
    const [row] = await this.db
      .select()
      .from(storyVisualAssetSets)
      .where(
        and(
          eq(storyVisualAssetSets.householdId, scope.householdId),
          eq(storyVisualAssetSets.childProfileId, scope.childProfileId),
          eq(storyVisualAssetSets.worldId, scope.worldId),
          eq(storyVisualAssetSets.storyId, storyId),
          eq(storyVisualAssetSets.active, true),
        ),
      )
      .limit(1);

    return row ? toAssetSet(row) : null;
  }

  async setActiveAssetSet(
    assetSetId: string,
    storyId: string,
    scope: Parameters<
      StoryVisualWorkspaceRepositoryPort["setActiveAssetSet"]
    >[2],
  ): Promise<PersistedStoryVisualAssetSet | null> {
    return this.db.transaction(async (tx) => {
      await tx
        .update(storyVisualAssetSets)
        .set({ active: false })
        .where(
          and(
            eq(storyVisualAssetSets.householdId, scope.householdId),
            eq(storyVisualAssetSets.childProfileId, scope.childProfileId),
            eq(storyVisualAssetSets.worldId, scope.worldId),
            eq(storyVisualAssetSets.storyId, storyId),
            eq(storyVisualAssetSets.active, true),
          ),
        );

      const [row] = await tx
        .update(storyVisualAssetSets)
        .set({ active: true })
        .where(
          and(
            eq(storyVisualAssetSets.id, assetSetId),
            eq(storyVisualAssetSets.householdId, scope.householdId),
            eq(storyVisualAssetSets.childProfileId, scope.childProfileId),
            eq(storyVisualAssetSets.worldId, scope.worldId),
            eq(storyVisualAssetSets.storyId, storyId),
          ),
        )
        .returning();

      return row ? toAssetSet(row) : null;
    });
  }

  async createRender(
    render: Parameters<StoryVisualWorkspaceRepositoryPort["createRender"]>[0],
  ): Promise<PersistedStoryVisualRender> {
    const [row] = await this.db
      .insert(storyVisualAssetSetRenders)
      .values({
        id: render.id,
        assetSetId: render.assetSetId,
        targetKind: render.targetKind,
        targetId: render.targetId,
        manifestEntityId: render.manifestEntityId ?? null,
        resolvedEntityId: render.resolvedEntityId ?? null,
        variantId: render.variantId ?? null,
        stateId: render.stateId ?? null,
        renderFingerprint: render.renderFingerprint,
        assetId: render.assetId ?? null,
        status: render.status,
      })
      .returning();

    return toRender(row!);
  }

  async listRenders(assetSetId: string): Promise<PersistedStoryVisualRender[]> {
    const rows = await this.db
      .select()
      .from(storyVisualAssetSetRenders)
      .where(eq(storyVisualAssetSetRenders.assetSetId, assetSetId))
      .orderBy(storyVisualAssetSetRenders.createdAt);

    return rows.map(toRender);
  }
}

type ManifestRow = typeof storyVisualManifests.$inferSelect;
type AssetSetRow = typeof storyVisualAssetSets.$inferSelect;
type RenderRow = typeof storyVisualAssetSetRenders.$inferSelect;

function toManifest(row: ManifestRow): PersistedStoryVisualManifest {
  return {
    id: row.id,
    scope: {
      householdId: row.householdId,
      childProfileId: row.childProfileId,
      worldId: row.worldId,
    },
    storyId: row.storyId,
    manifestFingerprint: row.manifestFingerprint,
    manifest: row.manifestJson as PersistedStoryVisualManifest["manifest"],
    createdAt: row.createdAt,
  };
}

function toAssetSet(row: AssetSetRow): PersistedStoryVisualAssetSet {
  return {
    id: row.id,
    manifestId: row.manifestId,
    scope: {
      householdId: row.householdId,
      childProfileId: row.childProfileId,
      worldId: row.worldId,
    },
    storyId: row.storyId,
    manifestFingerprint: row.manifestFingerprint,
    styleId: row.styleId as StoryVisualAssetSet["styleId"],
    styleVersion: row.styleVersion,
    status: row.status as StoryVisualAssetSet["status"],
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

function toRender(row: RenderRow): PersistedStoryVisualRender {
  return {
    id: row.id,
    assetSetId: row.assetSetId,
    targetKind: row.targetKind as PersistedStoryVisualRender["targetKind"],
    targetId: row.targetId,
    manifestEntityId: row.manifestEntityId,
    resolvedEntityId: row.resolvedEntityId,
    variantId: row.variantId,
    stateId: row.stateId,
    renderFingerprint: row.renderFingerprint,
    assetId: row.assetId,
    status: row.status as PersistedStoryVisualRender["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
