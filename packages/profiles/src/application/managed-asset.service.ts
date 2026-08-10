import { and, asc, eq } from "drizzle-orm";

import {
  managedAssetCanons,
  managedAssetLifecycleEvents,
  managedAssets,
} from "../db/schema/profile";
import { getProfileDb } from "./db";

export const MANAGED_ASSET_SUBJECT_TYPES = [
  "character",
  "npc",
  "location",
  "item",
  "story_scene",
] as const;

export type ManagedAssetSubjectType =
  (typeof MANAGED_ASSET_SUBJECT_TYPES)[number];
export type ManagedAssetLifecycleState =
  | "candidate"
  | "canonical"
  | "rejected"
  | "archived";
export type ManagedAssetOriginType =
  | "generated"
  | "uploaded"
  | "imported"
  | "derived";

export type ManagedAssetScope = {
  householdId: string;
  subjectType: ManagedAssetSubjectType;
  subjectId: string;
};

export type ManagedAssetAuthorizationPort = {
  assertCanManage(input: {
    userId: string;
    householdId: string;
    subjectType: ManagedAssetSubjectType;
    subjectId: string;
  }): Promise<void>;
};

export type ManagedAssetServiceDeps = {
  authorizationPort: ManagedAssetAuthorizationPort;
};

export type RegisterManagedAssetInput = ManagedAssetScope & {
  assetKind: string;
  storageRef: string;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  provider?: string | null;
  model?: string | null;
  originType?: ManagedAssetOriginType;
  sourceSystem?: string | null;
  sourceRecordId?: string | null;
  sourceAssetId?: string | null;
  provenance?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

function assertSubjectType(value: string): asserts value is ManagedAssetSubjectType {
  if (!MANAGED_ASSET_SUBJECT_TYPES.includes(value as ManagedAssetSubjectType)) {
    throw new Error("MANAGED_ASSET_SUBJECT_TYPE_INVALID");
  }
}

function assertAssetKind(assetKind: string) {
  if (!assetKind.trim() || assetKind.length > 64) {
    throw new Error("MANAGED_ASSET_KIND_INVALID");
  }
}

async function authorize(
  userId: string,
  scope: ManagedAssetScope,
  deps: ManagedAssetServiceDeps,
) {
  assertSubjectType(scope.subjectType);
  await deps.authorizationPort.assertCanManage({ userId, ...scope });
}

async function getScopedAsset(scope: ManagedAssetScope, assetId: string) {
  const [asset] = await getProfileDb()
    .select()
    .from(managedAssets)
    .where(
      and(
        eq(managedAssets.id, assetId),
        eq(managedAssets.householdId, scope.householdId),
        eq(managedAssets.subjectType, scope.subjectType),
        eq(managedAssets.subjectId, scope.subjectId),
      ),
    )
    .limit(1);
  return asset ?? null;
}

export async function listManagedAssets(
  userId: string,
  scope: ManagedAssetScope,
  deps: ManagedAssetServiceDeps,
) {
  await authorize(userId, scope, deps);
  return getProfileDb()
    .select()
    .from(managedAssets)
    .where(
      and(
        eq(managedAssets.householdId, scope.householdId),
        eq(managedAssets.subjectType, scope.subjectType),
        eq(managedAssets.subjectId, scope.subjectId),
      ),
    )
    .orderBy(asc(managedAssets.createdAt), asc(managedAssets.id));
}

export async function getManagedAssetCanon(
  userId: string,
  scope: ManagedAssetScope,
  assetKind: string,
  deps: ManagedAssetServiceDeps,
) {
  assertAssetKind(assetKind);
  await authorize(userId, scope, deps);
  const [canon] = await getProfileDb()
    .select()
    .from(managedAssetCanons)
    .where(
      and(
        eq(managedAssetCanons.householdId, scope.householdId),
        eq(managedAssetCanons.subjectType, scope.subjectType),
        eq(managedAssetCanons.subjectId, scope.subjectId),
        eq(managedAssetCanons.assetKind, assetKind),
      ),
    )
    .limit(1);
  return canon ?? null;
}

export async function registerManagedAssetMetadata(
  userId: string,
  input: RegisterManagedAssetInput,
  deps: ManagedAssetServiceDeps,
) {
  assertAssetKind(input.assetKind);
  if (!input.storageRef.trim()) throw new Error("MANAGED_ASSET_STORAGE_REF_REQUIRED");
  await authorize(userId, input, deps);

  const db = getProfileDb();
  const assetId = crypto.randomUUID();
  const rows = await db
    .insert(managedAssets)
    .values({
      id: assetId,
      householdId: input.householdId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      assetKind: input.assetKind,
      storageRef: input.storageRef,
      mimeType: input.mimeType ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      provider: input.provider ?? null,
      model: input.model ?? null,
      originType: input.originType ?? "uploaded",
      lifecycleState: "candidate",
      sourceSystem: input.sourceSystem ?? null,
      sourceRecordId: input.sourceRecordId ?? null,
      sourceAssetId: input.sourceAssetId ?? null,
      provenance: input.provenance ?? {},
      metadata: input.metadata ?? {},
    })
    .returning();

  await db.insert(managedAssetLifecycleEvents).values({
    id: crypto.randomUUID(),
    householdId: input.householdId,
    assetId,
    fromState: null,
    toState: "candidate",
    reason: "registered",
    actorType: "parent",
    actorUserId: userId,
    metadata: {},
  });

  return rows[0]!;
}

export async function selectManagedAssetCanon(
  userId: string,
  scope: ManagedAssetScope,
  assetId: string,
  deps: ManagedAssetServiceDeps,
) {
  await authorize(userId, scope, deps);
  const asset = await getScopedAsset(scope, assetId);
  if (!asset || asset.lifecycleState === "rejected") {
    throw new Error("MANAGED_ASSET_NOT_SELECTABLE");
  }

  const current = await getManagedAssetCanon(
    userId,
    scope,
    asset.assetKind,
    deps,
  );
  if (current?.selectedAssetId === asset.id) return current;

  const now = new Date();
  const db = getProfileDb();
  await db.transaction(async (tx) => {
    if (current?.selectedAssetId) {
      const [previous] = await tx
        .select()
        .from(managedAssets)
        .where(eq(managedAssets.id, current.selectedAssetId))
        .limit(1);
      if (previous) {
        await tx
          .update(managedAssets)
          .set({
            lifecycleState: "archived",
            archivedAt: now,
            updatedAt: now,
          })
          .where(eq(managedAssets.id, previous.id));
        await tx.insert(managedAssetLifecycleEvents).values({
          id: crypto.randomUUID(),
          householdId: scope.householdId,
          assetId: previous.id,
          fromState: previous.lifecycleState,
          toState: "archived",
          reason: "canon_replaced",
          actorType: "parent",
          actorUserId: userId,
          metadata: { replacementAssetId: asset.id },
        });
      }
    }

    await tx
      .update(managedAssets)
      .set({
        lifecycleState: "canonical",
        rejectedAt: null,
        archivedAt: null,
        updatedAt: now,
      })
      .where(eq(managedAssets.id, asset.id));
    await tx.insert(managedAssetLifecycleEvents).values({
      id: crypto.randomUUID(),
      householdId: scope.householdId,
      assetId: asset.id,
      fromState: asset.lifecycleState,
      toState: "canonical",
      reason: current ? "canon_replaced" : "canon_selected",
      actorType: "parent",
      actorUserId: userId,
      metadata: current?.selectedAssetId
        ? { previousAssetId: current.selectedAssetId }
        : {},
    });

    if (current) {
      await tx
        .update(managedAssetCanons)
        .set({
          selectedAssetId: asset.id,
          status: "selected",
          selectedAt: now,
          version: current.version + 1,
          updatedAt: now,
        })
        .where(eq(managedAssetCanons.id, current.id));
    } else {
      await tx.insert(managedAssetCanons).values({
        id: crypto.randomUUID(),
        householdId: scope.householdId,
        subjectType: scope.subjectType,
        subjectId: scope.subjectId,
        assetKind: asset.assetKind,
        selectedAssetId: asset.id,
        status: "selected",
        selectedAt: now,
      });
    }
  });

  return getManagedAssetCanon(userId, scope, asset.assetKind, deps);
}

export async function rejectManagedAsset(
  userId: string,
  scope: ManagedAssetScope,
  assetId: string,
  deps: ManagedAssetServiceDeps,
) {
  await authorize(userId, scope, deps);
  const asset = await getScopedAsset(scope, assetId);
  if (!asset) throw new Error("MANAGED_ASSET_NOT_FOUND");
  const canon = await getManagedAssetCanon(userId, scope, asset.assetKind, deps);
  if (canon?.selectedAssetId === asset.id) {
    throw new Error("CANNOT_REJECT_ACTIVE_MANAGED_ASSET_CANON");
  }
  if (asset.lifecycleState === "rejected") return asset;

  const now = new Date();
  const db = getProfileDb();
  const [updated] = await db
    .update(managedAssets)
    .set({ lifecycleState: "rejected", rejectedAt: now, updatedAt: now })
    .where(eq(managedAssets.id, asset.id))
    .returning();
  await db.insert(managedAssetLifecycleEvents).values({
    id: crypto.randomUUID(),
    householdId: scope.householdId,
    assetId: asset.id,
    fromState: asset.lifecycleState,
    toState: "rejected",
    reason: "rejected",
    actorType: "parent",
    actorUserId: userId,
    metadata: {},
  });
  return updated!;
}

export async function archiveManagedAsset(
  userId: string,
  scope: ManagedAssetScope,
  assetId: string,
  deps: ManagedAssetServiceDeps,
) {
  await authorize(userId, scope, deps);
  const asset = await getScopedAsset(scope, assetId);
  if (!asset) throw new Error("MANAGED_ASSET_NOT_FOUND");
  const canon = await getManagedAssetCanon(userId, scope, asset.assetKind, deps);
  if (canon?.selectedAssetId === asset.id) {
    throw new Error("CANNOT_ARCHIVE_ACTIVE_MANAGED_ASSET_CANON");
  }
  if (asset.lifecycleState === "archived") return asset;

  const now = new Date();
  const db = getProfileDb();
  const [updated] = await db
    .update(managedAssets)
    .set({ lifecycleState: "archived", archivedAt: now, updatedAt: now })
    .where(eq(managedAssets.id, asset.id))
    .returning();
  await db.insert(managedAssetLifecycleEvents).values({
    id: crypto.randomUUID(),
    householdId: scope.householdId,
    assetId: asset.id,
    fromState: asset.lifecycleState,
    toState: "archived",
    reason: "archived",
    actorType: "parent",
    actorUserId: userId,
    metadata: {},
  });
  return updated!;
}

export async function getManagedAssetLifecycleHistory(
  userId: string,
  scope: ManagedAssetScope,
  assetId: string,
  deps: ManagedAssetServiceDeps,
) {
  await authorize(userId, scope, deps);
  const asset = await getScopedAsset(scope, assetId);
  if (!asset) throw new Error("MANAGED_ASSET_NOT_FOUND");
  return getProfileDb()
    .select()
    .from(managedAssetLifecycleEvents)
    .where(
      and(
        eq(managedAssetLifecycleEvents.householdId, scope.householdId),
        eq(managedAssetLifecycleEvents.assetId, asset.id),
      ),
    )
    .orderBy(asc(managedAssetLifecycleEvents.createdAt));
}
