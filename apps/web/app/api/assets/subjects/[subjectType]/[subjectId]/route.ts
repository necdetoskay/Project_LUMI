import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { WebManagedAssetAuthorizationAdapter } from "@/lib/assets/managed-asset-authorization";
import {
  getManagedAssetCanon,
  listManagedAssets,
} from "@lumi/profiles/application";

const paramsSchema = z.object({
  subjectType: z.enum(["character", "npc", "location", "item", "story_scene"]),
  subjectId: z.string().uuid(),
});

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ subjectType: string; subjectId: string }>;
  },
) {
  return withParent(async (parent) => {
    try {
      const parsed = paramsSchema.parse(await params);
      const url = new URL(request.url);
      const householdId = url.searchParams.get("householdId");
      if (!householdId) {
        return NextResponse.json(
          { error: "HOUSEHOLD_ID_REQUIRED" },
          { status: 400 },
        );
      }
      const assetKind = url.searchParams.get("assetKind");
      const scope = {
        householdId,
        subjectType: parsed.subjectType,
        subjectId: parsed.subjectId,
      };
      const deps = {
        authorizationPort: new WebManagedAssetAuthorizationAdapter(),
      };
      const [assets, canon] = await Promise.all([
        listManagedAssets(parent.id, scope, deps),
        assetKind
          ? getManagedAssetCanon(parent.id, scope, assetKind, deps)
          : Promise.resolve(null),
      ]);
      return NextResponse.json({
        subject: {
          type: parsed.subjectType,
          id: parsed.subjectId,
        },
        assets,
        canon,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "MANAGED_ASSET_ERROR";
      const status = message.includes("FORBIDDEN")
        ? 403
        : message.includes("NOT_FOUND")
          ? 404
          : message.includes("RESOLVER_NOT_AVAILABLE")
            ? 501
            : 400;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
